import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { track } from "@/lib/analytics";
import { TranslationBlock } from "../_types";

// M-3: Cache the canvas-confetti dynamic import at module level.
// Previously imported inside handleTranslate on every success call,
// paying dynamic module resolution overhead each time.
let _confettiPromise: Promise<any> | null = null;
function getConfetti() {
  if (!_confettiPromise) {
    _confettiPromise = import("canvas-confetti");
  }
  return _confettiPromise;
}

interface UseTranslationStreamProps {
  mode: string;
  sourceLanguage: string;
  targetLanguage: string;
  input: string;
  customInstructions: string;
  activeWorkspace: any;
  isPro: boolean;
  session: any;
  sessionId: string;
  setSessionId: (id: string) => void;
  repositoryName: string;
  filePath: string;
  setModelUsed: (model: string | null) => void;
}

export function useTranslationStream({
  mode,
  sourceLanguage,
  targetLanguage,
  input,
  customInstructions,
  activeWorkspace,
  isPro,
  session,
  sessionId,
  setSessionId,
  repositoryName,
  filePath,
  setModelUsed,
}: UseTranslationStreamProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [rawError, setRawError] = useState("");
  const [outputBlocks, setOutputBlocks] = useState<TranslationBlock[] | null>(null);
  const [originalBlocks, setOriginalBlocks] = useState<TranslationBlock[] | null>(null);
  
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const streamBufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  // FIX-18 (P1-10): AbortController to cancel the in-flight fetch when streaming stops.
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;

    if (isStreaming && readerRef.current) {
      // FIX-18: Cancel both the reader AND the underlying fetch via AbortController.
      readerRef.current.cancel();
      abortControllerRef.current?.abort();
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setOutputBlocks(null);
    setStreamText("");
    setRawError("");
    setModelUsed(null);

    const translateStartTime = Date.now();
    track("translation_started", {
      mode,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      char_count: input.length,
      is_pro: isPro,
    });

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      let endpoint = "";
      let body: Record<string, string> = {};
      
      const promptSuffix = customInstructions.trim() ? `\n\n[CORPORATE STANDARDS / CUSTOM INSTRUCTIONS: ${customInstructions}]` : "";

      if (mode === "code-to-english") {
        endpoint = "/api/code-to-english";
        body = { raw_code: input, language: sourceLanguage };
      } else if (mode === "english-to-code") {
        endpoint = "/api/generate-from-english";
        body = { prompt: input + promptSuffix, language: targetLanguage };
      } else {
        endpoint = "/api/code-to-code";
        body = { raw_code: input, source_language: sourceLanguage, target_language: targetLanguage };
      }
      
      if (activeWorkspace) {
        body.workspace_id = activeWorkspace.id;
      }
      
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        setSessionId(currentSessionId);
      }
      body.session_id = currentSessionId;
      if (repositoryName) body.repository_name = repositoryName;
      if (filePath) body.file_path = filePath;
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // FIX-18 (P1-10): Create a fresh AbortController for each streaming request.
      abortControllerRef.current = new AbortController();

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder("utf-8");

      let completeBlocks = null;
      let streamError = null;

      // Flush the rAF buffer to React state at display refresh cadence
      const scheduleFlush = () => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (streamBufferRef.current) {
            const pending = streamBufferRef.current;
            streamBufferRef.current = "";
            setStreamText(prev => prev + pending);
          }
        });
      };

      let streamBuffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (streamBuffer.trim()) {
            const line = streamBuffer.trim();
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  streamError = data.error;
                  setRawError(`Error: ${data.error}`);
                } else if (data.chunk) {
                  streamBufferRef.current += data.chunk;
                  scheduleFlush();
                } else if (data.done && data.blocks) {
                  completeBlocks = data.blocks;
                  if (data.model_used) {
                    setModelUsed(data.model_used);
                  }
                }
              } catch {
                // Ignore
              }
            }
          }
          break;
        }

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              
              if (data.error) {
                streamError = data.error;
                setRawError(`Error: ${data.error}`);
              } else if (data.chunk) {
                // Buffer; flush asynchronously at rAF cadence
                streamBufferRef.current += data.chunk;
                scheduleFlush();
              } else if (data.done && data.blocks) {
                completeBlocks = data.blocks;
                if (data.model_used) {
                  setModelUsed(data.model_used);
                }
              }
            } catch {
              // Ignore invalid JSON chunks (might be split across packets)
            }
          }
        }
      }

      // Final flush
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (streamBufferRef.current) {
        setStreamText(prev => prev + streamBufferRef.current);
        streamBufferRef.current = "";
      }

      if (completeBlocks && !streamError) {
        setOutputBlocks(completeBlocks);
        setOriginalBlocks(JSON.parse(JSON.stringify(completeBlocks)));
        const latency = Date.now() - translateStartTime;
        track("translation_completed", {
          mode,
          block_count: completeBlocks.length,
          model_used: completeBlocks[0]?.model_used || "unknown",
          latency_ms: latency,
          from_cache: false,
        });

        // M-2: Debounce the three SWR revalidations into one batch after 500ms.
        // Gives the backend time to persist history before refetching, and
        // prevents three separate network calls / render cycles firing at once.
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        if (session?.access_token) {
          setTimeout(() => {
            mutate([`${API_BASE}/api/stats`, session.access_token]);
            mutate([`${API_BASE}/api/history?limit=5`, session.access_token]);
            mutate([`${API_BASE}/api/check-credits`, session.access_token]);
          }, 500);
        }

        // M-3: Use cached confetti promise (module-level singleton, not re-imported per call)
        getConfetti().then((module) => {
          module.default({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.8, x: 0.8 },
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1']
          });
        }).catch((err) => console.error("Confetti dynamic import failed", err));
      }
      
    } catch (err: unknown) {
      const errorObj = err as Error & { name?: string; status?: number };
      if (errorObj?.name === "AbortError" || errorObj?.message?.includes("abort")) {
        toast.info("Translation stopped");
      } else {
        const message = err instanceof Error ? err.message : "Translation failed";
        setRawError(`Error: ${message}`);
        toast.error(message);
        track("translation_failed", {
          mode,
          error_type: errorObj?.name || "unknown",
          status_code: errorObj?.status || null,
        });
      }
    } finally {
      setIsStreaming(false);
      readerRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sourceLanguage, targetLanguage, input, customInstructions, activeWorkspace, isPro, session, sessionId, setSessionId, repositoryName, filePath]);

  return {
    isStreaming,
    streamText,
    rawError,
    outputBlocks,
    originalBlocks,
    setOutputBlocks,
    setOriginalBlocks,
    setStreamText,
    setRawError,
    handleTranslate
  };
}
