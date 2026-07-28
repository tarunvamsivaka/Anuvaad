"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { useWorkspace } from "@/context/WorkspaceContext";
// FIX-21 (P2-08): Typed session — eliminates (session as any) casts
import { asAnuvaadSession } from "@/lib/supabase-types";
// FIX-22 (P2-10): Stable module-level fetcher — prevents per-render refetches
import { authFetcher } from "@/lib/swr-fetcher";

// Components
import { TranslateShell } from "./_components/TranslateShell";
import { Toolbar } from "./_components/Toolbar";
import { InputPanel } from "./_components/InputPanel";
import { OutputPanel } from "./_components/OutputPanel";

// Hooks
import { useTranslationStream } from "./_hooks/useTranslationStream";
import { detectLanguage } from "./_hooks/useLanguageDetection";
import { useFileImport } from "./_hooks/useFileImport";
import { useTranslationSession } from "./_hooks/useTranslationSession";

// ── M-1: Lifted to module scope so the object is never re-created on render ──
const MONACO_OPTIONS: Record<string, unknown> = {
  minimap: { enabled: false },
  fontSize: 13,
  lineHeight: 1.6,
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: "smooth",
  cursorSmoothCaretAnimation: "on",
  formatOnPaste: true,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace",
  fontLigatures: true,
  renderWhitespace: "selection",
  guides: { bracketPairs: true, indentation: true },
  bracketPairColorization: { enabled: true },
};

export function TranslateFeature() {
  const { session: rawSession } = useAuth();
  const session = asAnuvaadSession(rawSession); // FIX-21: typed cast
  const { activeWorkspace } = useWorkspace();
  const { theme, systemTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState("code-to-english");
  const [sourceLanguage, setSourceLanguage] = useState("python");
  const [targetLanguage, setTargetLanguage] = useState("javascript");
  const [viewType, setViewType] = useState<"editor" | "blocks" | "diff">("editor");
  const [customInstructions, setCustomInstructions] = useState("");
  const [repositoryName, setRepositoryName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [input, setInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [gistSource, setGistSource] = useState<{ username: string; filename: string } | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");

  const { data: creditsData, isLoading: creditsLoading } = useSWR(
    session?.access_token ? ["/api/check-credits", session.access_token] : null,
    authFetcher
  ) as { data: { credits?: number; tier?: string } | undefined; isLoading: boolean };

  const credits = creditsData?.credits ?? session?.user?.user_metadata?.credits;
  const isPro = creditsData?.tier === "pro" || session?.user?.user_metadata?.is_pro === true;

  const {
    selectedModel,
    setSelectedModel,
    outputBlocks,
    setOutputBlocks,
    originalBlocks,
    setOriginalBlocks,
    isStreaming,
    streamText,
    rawError,
    setRawError,
    setStreamText,
    handleTranslate,
    elapsedTime,
    tokenCount,
    throughput,
  } = useTranslationStream({
    input,
    mode,
    sourceLanguage,
    targetLanguage,
    customInstructions,
    activeWorkspace,
    isPro: isPro || false,
    session,
    sessionId,
    setSessionId,
    repositoryName,
    filePath,
    setModelUsed: setModelUsed as any,
  });

  const handleClear = () => {
    setOutputBlocks(null);
    setStreamText("");
    setRawError("");
  };

  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  useEffect(() => {
    if (isStreaming || !input) return;
    const timeout = setTimeout(() => {
      const detected = detectLanguage(input);
      if (detected && detected !== sourceLanguage) {
        setDetectedLang(detected);
      } else {
        setDetectedLang(null);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [input, isStreaming, sourceLanguage]);

  const {
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
  } = useFileImport({
    mode,
    setInput,
    setUploadedFile,
    setFilePath,
    setSourceLanguage,
    setGistSource,
  });

  const {
    isSyncing,
    copied,
    hasEdits,
    handleSyncEnglishToCode,
    handleCopyMarkdown,
    handleCopyCode,
    handleDownloadJson,
    handleExportCode,
  } = useTranslationSession({
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
  });

  const currentModeLabel =
    mode === "code-to-english"
      ? "Code to English"
      : mode === "english-to-code"
      ? "English to Code"
      : "Code to Code";

  const handleSwapContent = () => {
    if (outputBlocks && outputBlocks.length > 0) {
      const codeText = outputBlocks.map(b => b.code_snippet).filter(Boolean).join("\n\n");
      if (codeText) {
        setInput(codeText);
        setOutputBlocks(null);
        setStreamText("");
      }
    }
  };

  return (
    <TranslateShell
      currentModeLabel={currentModeLabel}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      isPro={isPro}
      creditsLoading={creditsLoading}
      credits={credits}
      customInstructions={customInstructions}
      setCustomInstructions={setCustomInstructions}
      repositoryName={repositoryName}
      setRepositoryName={setRepositoryName}
      filePath={filePath}
      setFilePath={setFilePath}
      toolbar={
        <Toolbar
          mode={mode}
          setMode={setMode}
          sourceLanguage={sourceLanguage}
          setSourceLanguage={setSourceLanguage}
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
          repositoryName={repositoryName}
          setRepositoryName={setRepositoryName}
          filePath={filePath}
          setFilePath={setFilePath}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onSwapContent={handleSwapContent}
        />
      }
      inputPanel={
        <InputPanel
          mode={mode}
          uploadedFile={uploadedFile}
          handleClearFile={handleClearFile}
          gistSource={gistSource}
          setGistSource={setGistSource}
          input={input}
          setInput={setInput}
          isStreaming={isStreaming}
          handleTranslate={handleTranslate}
          handleClear={() => {
            handleClear();
            handleClearFile();
          }}
          sourceLanguage={sourceLanguage}
          setSourceLanguage={setSourceLanguage}
          isDark={isDark}
          monacoOptions={MONACO_OPTIONS}
          detectedLang={detectedLang}
          setDetectedLang={setDetectedLang}
          isTypingManually={isTypingManually}
          setIsTypingManually={setIsTypingManually}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
          showGistInput={showGistInput}
          setShowGistInput={setShowGistInput}
          gistUrl={gistUrl}
          setGistUrl={setGistUrl}
          gistLoading={gistLoading}
          handleGistImport={handleGistImport}
          hasOutputBlocks={!!outputBlocks && outputBlocks.length > 0}
          fileList={fileList}
          repoInfo={repoInfo}
          handleSelectFile={handleSelectFile}
          setFileList={setFileList}
          workbenchFiles={workbenchFiles}
          activeFileId={activeFileId}
          selectWorkbenchFile={selectWorkbenchFile}
          closeWorkbenchFile={closeWorkbenchFile}
        />
      }
      outputPanel={
        <OutputPanel
          mode={mode}
          outputBlocks={outputBlocks}
          viewType={viewType}
          setViewType={setViewType}
          handleCopyMarkdown={handleCopyMarkdown}
          handleCopyCode={handleCopyCode}
          handleExportCode={handleExportCode}
          copied={copied}
          handleDownloadJson={handleDownloadJson}
          hasEdits={hasEdits}
          originalBlocks={originalBlocks}
          setOutputBlocks={setOutputBlocks}
          isSyncing={isSyncing}
          handleSyncEnglishToCode={handleSyncEnglishToCode}
          isStreaming={isStreaming}
          streamText={streamText}
          rawError={rawError}
          input={input}
          targetLanguage={targetLanguage}
          isDark={isDark}
          monacoOptions={MONACO_OPTIONS}
          modelUsed={modelUsed}
          elapsedTime={elapsedTime}
          tokenCount={tokenCount}
          throughput={throughput}
        />
      }
    />
  );
}
