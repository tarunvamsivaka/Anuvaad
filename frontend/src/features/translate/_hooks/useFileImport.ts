import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { EXT_TO_LANGUAGE, ACCEPTED_EXTENSIONS } from "../_constants/languages";

interface UseFileImportProps {
  mode: string;
  setInput: (input: string) => void;
  setUploadedFile: (file: { name: string; size: number } | null) => void;
  setFilePath: (path: string) => void;
  setSourceLanguage: (lang: string) => void;
  setGistSource: (source: { username: string; filename: string } | null) => void;
}

export function useFileImport({
  mode,
  setInput,
  setUploadedFile,
  setFilePath,
  setSourceLanguage,
  setGistSource,
}: UseFileImportProps) {
  const [showGistInput, setShowGistInput] = useState(false);
  const [gistUrl, setGistUrl] = useState("");
  const [gistLoading, setGistLoading] = useState(false);
  const [isTypingManually, setIsTypingManually] = useState(false);

  const onFileDrop = useCallback((acceptedFiles: globalThis.File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!EXT_TO_LANGUAGE[ext]) {
      toast.error(`Unsupported file type. Allowed: ${ACCEPTED_EXTENSIONS.join(", ")}`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setInput(text);
      setUploadedFile({ name: file.name, size: file.size });
      setFilePath(file.name);
      // Auto-detect language
      const detectedLang = EXT_TO_LANGUAGE[ext];
      if (detectedLang) setSourceLanguage(detectedLang);
      track("file_uploaded", { extension: ext, size_bytes: file.size, detected_language: detectedLang || "unknown" });
    };
    reader.readAsText(file);
  }, [setInput, setUploadedFile, setFilePath, setSourceLanguage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileDrop,
    accept: { "text/plain": ACCEPTED_EXTENSIONS },
    maxFiles: 1,
    noClick: false,
    disabled: mode === "english-to-code",
  });

  const handleGistImport = async () => {
    if (!gistUrl.trim()) return;
    setGistLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/import-gist?url=${encodeURIComponent(gistUrl.trim())}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setInput(data.content);
      setSourceLanguage(data.language);
      setGistSource({ username: data.username, filename: data.filename });
      setUploadedFile(null);
      setShowGistInput(false);
      setGistUrl("");
      toast.success(`Imported ${data.filename} (${data.char_count.toLocaleString()} chars)`);
      track("gist_imported", { language: data.language, char_count: data.char_count, username: data.username });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to import Gist";
      toast.error(message);
    } finally {
      setGistLoading(false);
    }
  };

  const handleClearFile = useCallback(() => {
    setUploadedFile(null);
    setGistSource(null);
    setInput("");
    setIsTypingManually(false);
  }, [setInput, setUploadedFile, setGistSource]);

  return {
    showGistInput,
    setShowGistInput,
    gistUrl,
    setGistUrl,
    gistLoading,
    isTypingManually,
    setIsTypingManually,
    getRootProps,
    getInputProps,
    isDragActive,
    handleGistImport,
    handleClearFile,
  };
}
