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

export interface WorkbenchFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  size: number;
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
  const [fileList, setFileList] = useState<{name: string; path: string; type: string}[] | null>(null);
  const [repoInfo, setRepoInfo] = useState<{username: string; repo: string} | null>(null);
  const [workbenchFiles, setWorkbenchFiles] = useState<WorkbenchFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const selectWorkbenchFile = useCallback((fileId: string) => {
    setWorkbenchFiles(prev => {
      const found = prev.find(f => f.id === fileId);
      if (found) {
        setActiveFileId(found.id);
        setInput(found.content);
        setFilePath(found.path || found.name);
        setUploadedFile({ name: found.name, size: found.size });
        if (found.language) setSourceLanguage(found.language);
      }
      return prev;
    });
  }, [setInput, setFilePath, setUploadedFile, setSourceLanguage]);

  const closeWorkbenchFile = useCallback((fileId: string) => {
    setWorkbenchFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      if (activeFileId === fileId) {
        if (updated.length > 0) {
          const next = updated[updated.length - 1];
          setActiveFileId(next.id);
          setInput(next.content);
          setFilePath(next.path || next.name);
          setUploadedFile({ name: next.name, size: next.size });
          if (next.language) setSourceLanguage(next.language);
        } else {
          setActiveFileId(null);
          setInput("");
          setUploadedFile(null);
          setFilePath("");
        }
      }
      return updated;
    });
  }, [activeFileId, setInput, setFilePath, setUploadedFile, setSourceLanguage]);

  const onFileDrop = useCallback((acceptedFiles: globalThis.File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    const readPromises = acceptedFiles.map(file => {
      return new Promise<WorkbenchFile | null>((resolve) => {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!EXT_TO_LANGUAGE[ext]) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          const detectedLang = EXT_TO_LANGUAGE[ext] || "python";
          resolve({
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            path: file.name,
            content: text,
            language: detectedLang,
            size: file.size,
          });
        };
        reader.readAsText(file);
      });
    });

    Promise.all(readPromises).then(files => {
      const validFiles = files.filter((f): f is WorkbenchFile => f !== null);
      if (validFiles.length === 0) {
        toast.error(`Unsupported file type(s). Allowed: ${ACCEPTED_EXTENSIONS.join(", ")}`);
        return;
      }

      setWorkbenchFiles(prev => {
        const combined = [...prev, ...validFiles];
        const firstNew = validFiles[0];
        setActiveFileId(firstNew.id);
        setInput(firstNew.content);
        setUploadedFile({ name: firstNew.name, size: firstNew.size });
        setFilePath(firstNew.path);
        if (firstNew.language) setSourceLanguage(firstNew.language);
        return combined;
      });

      toast.success(`Loaded ${validFiles.length} file(s) into multi-file workbench`);
      track("files_uploaded", { count: validFiles.length });
    });
  }, [setInput, setUploadedFile, setFilePath, setSourceLanguage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileDrop,
    accept: { "text/plain": ACCEPTED_EXTENSIONS },
    maxFiles: 10,
    noClick: false,
    disabled: mode === "english-to-code",
  });

  const handleGistImport = async () => {
    if (!gistUrl.trim()) return;
    setGistLoading(true);
    try {
      const res = await fetch(`/api/import-gist?url=${encodeURIComponent(gistUrl.trim())}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.type === "directory") {
        setFileList(data.files);
        setRepoInfo({ username: data.username, repo: data.repo });
      } else {
        const newFile: WorkbenchFile = {
          id: `gist-${Date.now()}`,
          name: data.filename,
          path: data.filename,
          content: data.content,
          language: data.language,
          size: data.char_count || data.content.length,
        };
        setWorkbenchFiles(prev => [...prev, newFile]);
        setActiveFileId(newFile.id);
        setInput(data.content);
        setSourceLanguage(data.language);
        setGistSource({ username: data.username, filename: data.filename });
        setUploadedFile({ name: data.filename, size: newFile.size });
        setShowGistInput(false);
        toast.success(`Imported ${data.filename} (${data.char_count.toLocaleString()} chars)`);
        track("gist_imported", { language: data.language, char_count: data.char_count, username: data.username });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to import Gist";
      toast.error(message);
    } finally {
      setGistLoading(false);
    }
  };

  const handleSelectFile = async (path: string) => {
    if (!gistUrl.trim()) return;
    setGistLoading(true);
    try {
      const res = await fetch(`/api/import-gist?url=${encodeURIComponent(gistUrl.trim())}&file_path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.type === "file") {
        const newFile: WorkbenchFile = {
          id: `repo-${Date.now()}-${path}`,
          name: data.filename || path.split("/").pop() || path,
          path: path,
          content: data.content,
          language: data.language,
          size: data.char_count || data.content.length,
        };
        setWorkbenchFiles(prev => [...prev, newFile]);
        setActiveFileId(newFile.id);
        setInput(data.content);
        setSourceLanguage(data.language);
        setGistSource({ username: data.username, filename: data.filename || path });
        setUploadedFile({ name: newFile.name, size: newFile.size });
        setShowGistInput(false);
        setFileList(null);
        setGistUrl("");
        toast.success(`Imported ${newFile.name} (${data.char_count.toLocaleString()} chars)`);
        track("gist_imported", { language: data.language, char_count: data.char_count, username: data.username });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to import file";
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
    setWorkbenchFiles([]);
    setActiveFileId(null);
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
    fileList,
    repoInfo,
    handleSelectFile,
    setFileList,
    workbenchFiles,
    activeFileId,
    selectWorkbenchFile,
    closeWorkbenchFile,
  };
}

