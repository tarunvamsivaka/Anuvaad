import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { track } from "@/lib/analytics";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { TranslationBlock } from "../_types";
import type { QuotaError } from "@/components/modals/QuotaExceededModal";
import { parseQuotaErrorPayload } from "@/components/modals/QuotaExceededModal";
import { useTranslationStore } from "../_store/useTranslationStore";
import { useShallow } from "zustand/react/shallow";
import {
  getHttpFailureMessage,
  INTERRUPTED_MESSAGE,
  PROVIDER_FAILURE_MESSAGE,
} from "./translationErrors";
import type { Workspace } from "@/context/WorkspaceContext";
import type { AnuvaadSession } from "@/lib/supabase-types";
import { getByokKey } from "@/lib/byok-vault";
import { isGuestLimitReached, incrementGuestUsage, getGuestRemainingSeconds } from "@/lib/guest-sandbox";

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

class FatalError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "FatalError";
  }
}
class QuotaErrorObj extends Error {
  payload: unknown;
  retryAfter: string | null;
  constructor(payload: unknown, retryAfter: string | null) {
    super("QuotaExceeded");
    this.name = "QuotaExceeded";
    this.payload = payload;
    this.retryAfter = retryAfter;
  }
}

interface UseTranslationStreamProps {
  mode: string;
  sourceLanguage: string;
  targetLanguage: string;
  customInstructions: string;
  activeWorkspace: Workspace | null;
  isPro: boolean;
  session: AnuvaadSession | null;
  repositoryName: string;
  filePath: string;
  selectedModel?: string;
  skipAppHistory?: boolean;
}

export function useTranslationStream({
  mode,
  sourceLanguage,
  targetLanguage,
  customInstructions,
  activeWorkspace,
  isPro,
  session,
  repositoryName,
  filePath,
  selectedModel,
  skipAppHistory = false,
}: UseTranslationStreamProps) {
  const {
    input,
    isStreaming, setIsStreaming,
    setStreamText,
    setRawError,
    setOutputBlocks,
    setOriginalBlocks,
    setModelUsed,
    sessionId, setSessionId
  } = useTranslationStore(useShallow((state) => ({
    input: state.input,
    isStreaming: state.isStreaming,
    setIsStreaming: state.setIsStreaming,
    setStreamText: state.setStreamText,
    setOutputBlocks: state.setOutputBlocks,
    setRawError: state.setRawError,
    setOriginalBlocks: state.setOriginalBlocks,
    setModelUsed: state.setModelUsed,
    sessionId: state.sessionId,
    setSessionId: state.setSessionId,
  })));

  // M3 Feature #7: Structured 429 quota error — consumed by QuotaExceededModal.
  const [quotaError, setQuotaError] = useState<QuotaError | null>(null);
  const dismissQuotaError = useCallback(() => setQuotaError(null), []);
  
  const streamBufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  // FIX-18 (P1-10): AbortController to cancel the in-flight fetch when streaming stops.
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearPartialOutput = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    streamBufferRef.current = "";
    setStreamText("");
  }, [setStreamText]);

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;

    if (isStreaming && abortControllerRef.current) {
      // FIX-18: Cancel the underlying fetch via AbortController.
      abortControllerRef.current.abort();
      clearPartialOutput();
      setIsStreaming(false);
      return;
    }

    // Guest Sandbox Rate Limit Check (Milestone 4)
    if (!session?.access_token && isGuestLimitReached()) {
      const remainingSeconds = getGuestRemainingSeconds();
      setQuotaError({
        detail: "You have used your 3 free guest translations for today. Sign up for free to unlock 25 daily translations!",
        limit_type: "guest_daily_limit",
        retry_after_seconds: remainingSeconds,
        tier_limit: 3,
      });
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
      // Use relative /api/... paths — routed through Next.js proxy (next.config.ts rewrites).
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
      if (selectedModel) body.model = selectedModel;
      if (repositoryName) body.repository_name = repositoryName;
      if (filePath) body.file_path = filePath;
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      if (skipAppHistory) headers["X-Anuvaad-Privacy-Mode"] = "ephemeral";

      // Client-Side BYOK API Key Vault (Milestone 4)
      const byokKey = await getByokKey();
      if (byokKey && byokKey.trim()) {
        headers["X-User-LLM-Key"] = byokKey.trim();
      }

      // FIX-18 (P1-10): Create a fresh AbortController for each streaming request.
      abortControllerRef.current = new AbortController();

      let completeBlocks: TranslationBlock[] | null = null;
      let streamError: string | null = null;

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

      if (mode === "english-to-code") {
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
        });
        if (response.status === 429) {
          const payload = await response.json().catch(() => null);
          throw new QuotaErrorObj(payload, response.headers.get("Retry-After"));
        }
        if (!response.ok) {
          throw new FatalError(getHttpFailureMessage(response.status), response.status);
        }

        const data = await response.json();
        completeBlocks = Array.isArray(data) ? data : data?.blocks;
        if (!Array.isArray(completeBlocks) || completeBlocks.length === 0) {
          throw new FatalError("The translation service returned no code blocks.");
        }
        const modelUsed = data?.model_used || completeBlocks[0]?.model_used;
        if (modelUsed) {
          setModelUsed(modelUsed);
          if (selectedModel && modelUsed !== selectedModel) {
            track("model_fallback_triggered", { expected: selectedModel, actual: modelUsed });
          }
        }
      } else {
        await fetchEventSource(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
          async onopen(res) {
            if (res.ok) {
              return;
            }
            if (res.status === 429) {
              const retryAfterHeader = res.headers.get("Retry-After");
              const payload = await res.json().catch(() => null);
              throw new QuotaErrorObj(payload, retryAfterHeader);
            }
            if (res.status >= 400 && res.status < 500) {
              throw new FatalError(getHttpFailureMessage(res.status), res.status);
            }
            throw new FatalError(getHttpFailureMessage(res.status), res.status);
          },
          onmessage(msg) {
            if (!msg.data) return;
            try {
              const data = JSON.parse(msg.data);
              if (data.error) {
                streamError = PROVIDER_FAILURE_MESSAGE;
                clearPartialOutput();
                setRawError(PROVIDER_FAILURE_MESSAGE);
              } else if (data.chunk) {
                // Buffer; flush asynchronously at rAF cadence
                streamBufferRef.current += data.chunk;
                scheduleFlush();
              } else if (data.done && data.blocks) {
                completeBlocks = data.blocks;
                if (data.model_used) {
                  setModelUsed(data.model_used);
                  if (selectedModel && data.model_used !== selectedModel) {
                    track("model_fallback_triggered", { expected: selectedModel, actual: data.model_used });
                  }
                }
              }
            } catch {
              // Ignore invalid JSON chunks
            }
          },
          onerror(err) {
            if (err instanceof FatalError || err instanceof QuotaErrorObj) throw err;
            // Translation endpoints are POSTs and may consume quota. Require an
            // explicit user retry instead of silently submitting duplicate work.
            throw new FatalError(INTERRUPTED_MESSAGE);
          },
        });
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

      if (!completeBlocks && !streamError) {
        throw new FatalError(PROVIDER_FAILURE_MESSAGE);
      }

      if (completeBlocks && !streamError) {
        const blocks = completeBlocks as TranslationBlock[];
        setOutputBlocks(blocks);
        setOriginalBlocks(JSON.parse(JSON.stringify(blocks)));
        const latency = Date.now() - translateStartTime;
        track("translation_completed", {
          mode,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          block_count: blocks.length,
          blocks_count: blocks.length,
          model_used: blocks[0]?.model_used || "unknown",
          validation_status: mode === "code-to-english" ? "not_applicable" : "syntax_passed",
          latency_ms: latency,
          from_cache: false,
        });

        // M-2: Debounce the three SWR revalidations into one batch after 500ms.
        // Gives the backend time to persist history before refetching, and
        // prevents three separate network calls / render cycles firing at once.
        // Uses relative /api/... paths (Next.js proxy rewrite in next.config.ts).
        if (!session?.access_token) {
          incrementGuestUsage();
        }

        if (session?.access_token) {
          setTimeout(() => {
            mutate(['/api/stats', session.access_token]);
            if (!skipAppHistory) mutate(['/api/history?limit=5', session.access_token]);
            mutate(['/api/check-credits', session.access_token]);
          }, 500);
        }

        // M-3: Use cached confetti promise (module-level singleton, not re-imported per call)
        getConfetti().then((module) => {
          const confettiFn = module?.default ?? module;
          if (typeof confettiFn === "function") {
            confettiFn({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.8, x: 0.8 },
              colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1']
            });
          }
        }).catch((err) => console.error("Confetti dynamic import failed", err));
      }
      
    } catch (err: unknown) {
      if (err instanceof QuotaErrorObj) {
        clearPartialOutput();
        const quotaErr = parseQuotaErrorPayload(err.payload, err.retryAfter);
        setQuotaError(quotaErr);
        setIsStreaming(false);
        track('quota_hit', { mode });
        return;
      }
      const errorObj = err as { name?: string; message?: string; status?: number } | undefined;
      if (errorObj?.name === "AbortError" || errorObj?.message?.includes("abort")) {
        toast.info("Translation stopped");
      } else {
        clearPartialOutput();
        const message = err instanceof FatalError
          ? err.message
          : errorObj?.name === "TypeError"
            ? INTERRUPTED_MESSAGE
            : PROVIDER_FAILURE_MESSAGE;
        setRawError(message);
        toast.error(message);
        track("translation_failed", {
          mode,
          error_type: errorObj?.name || "unknown",
          status_code: errorObj?.status || null,
        });
      }
    } finally {
      setIsStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sourceLanguage, targetLanguage, input, customInstructions, activeWorkspace, isPro, session, sessionId, setSessionId, repositoryName, filePath, selectedModel, skipAppHistory, clearPartialOutput]);

  return {
    quotaError,
    setQuotaError,
    dismissQuotaError,
    handleTranslate
  };
}
