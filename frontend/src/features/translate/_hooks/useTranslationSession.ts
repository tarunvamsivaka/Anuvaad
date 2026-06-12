import { useState, useCallback } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { TranslationBlock } from "../_types";

interface UseTranslationSessionProps {
  outputBlocks: TranslationBlock[] | null;
  setOutputBlocks: (blocks: TranslationBlock[] | null) => void;
  originalBlocks: TranslationBlock[] | null;
  setOriginalBlocks: (blocks: TranslationBlock[] | null) => void;
  setInput: (input: string) => void;
  setModelUsed: (model: string | null) => void;
  setRawError: (err: string) => void;
  sourceLanguage: string;
  targetLanguage: string;
  customInstructions: string;
  activeWorkspace: any;
  session: any;
  sessionId: string;
  repositoryName: string;
  filePath: string;
  mode: string;
}

export function useTranslationSession({
  outputBlocks,
  setOutputBlocks,
  originalBlocks,
  setOriginalBlocks,
  setInput,
  setModelUsed,
  setRawError,
  sourceLanguage,
  targetLanguage,
  customInstructions,
  activeWorkspace,
  session,
  sessionId,
  repositoryName,
  filePath,
  mode,
}: UseTranslationSessionProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSyncEnglishToCode = async () => {
    if (!outputBlocks || !outputBlocks.length || isSyncing) return;
    setIsSyncing(true);
    setRawError("");
    
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const payload: Record<string, any> = {
        blocks: outputBlocks.map(b => ({
          id: b.id,
          code_snippet: b.code_snippet,
          english_translation: b.english_translation
        })),
        language: sourceLanguage,
        custom_instructions: customInstructions.trim() || null
      };

      if (session?.access_token) {
        payload.access_token = session.access_token;
      }
      if (activeWorkspace) {
        payload.workspace_id = activeWorkspace.id;
      }
      if (sessionId) payload.session_id = sessionId;
      if (repositoryName) payload.repository_name = repositoryName;
      if (filePath) payload.file_path = filePath;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API}/api/sync-english-to-code`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status === "success" && data.updated_code) {
        setInput(data.updated_code);
        setOutputBlocks(data.blocks);
        setOriginalBlocks(JSON.parse(JSON.stringify(data.blocks)));
        if (data.model_used) {
          setModelUsed(data.model_used);
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        if (session?.access_token) {
          mutate([`${API_BASE}/api/stats`, session.access_token]);
          mutate([`${API_BASE}/api/history?limit=5`, session.access_token]);
          mutate([`${API_BASE}/api/check-credits`, session.access_token]);
        }

        toast.success("Synchronized successfully! Code has been updated.");
      } else {
        throw new Error("No updated code returned from engine.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setRawError(`Error: ${message}`);
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyMarkdown = useCallback(() => {
    if (!outputBlocks) return;
    let content = "";
    
    if (mode === "code-to-english") {
      content = outputBlocks.map((b, i) => `## Block ${i + 1}\n\n### Code\n\`\`\`${sourceLanguage}\n${b.code_snippet}\n\`\`\`\n\n### Explanation\n${b.english_translation}\n`).join("\n---\n\n");
    } else {
      content = outputBlocks.map((b, i) => `## Block ${i + 1}\n\n\`\`\`${targetLanguage}\n${b.code_snippet}\n\`\`\`\n\n**Note**: ${b.english_translation}\n`).join("\n---\n\n");
    }
    
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied Markdown to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [outputBlocks, mode, sourceLanguage, targetLanguage]);

  const handleDownloadJson = useCallback(() => {
    if (!outputBlocks) return;
    const blob = new Blob([JSON.stringify(outputBlocks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anuvaad-blocks.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [outputBlocks]);

  const hasEdits = !!(originalBlocks && outputBlocks && JSON.stringify(originalBlocks) !== JSON.stringify(outputBlocks));

  return {
    isSyncing,
    copied,
    hasEdits,
    handleSyncEnglishToCode,
    handleCopyMarkdown,
    handleDownloadJson,
  };
}
