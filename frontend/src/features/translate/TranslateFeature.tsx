"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { useWorkspace } from "@/context/WorkspaceContext";
// FIX-21 (P2-08): Typed session — eliminates (session as any) casts
import { asAnuvaadSession } from "@/lib/supabase-types";
// FIX-22 (P2-10): Stable module-level fetcher — prevents per-render refetches
import { authFetcher } from "@/lib/swr-fetcher";
import { useTranslationStore } from "./_store/useTranslationStore";

// Components
import { TranslateShell } from "./_components/TranslateShell";
import { Toolbar } from "./_components/Toolbar";
import { InputPanel } from "./_components/InputPanel";
import { OutputPanel } from "./_components/OutputPanel";
import { QuotaExceededModal } from "@/components/modals/QuotaExceededModal";
import { GuestOnboardingModal } from "@/components/modals/GuestOnboardingModal";
import { SmartPasteListener } from "./_components/SmartPasteListener";
import { ArtifactExportBar } from "@/components/editor/ArtifactExportBar";

// Hooks
import { useTranslationStream } from "./_hooks/useTranslationStream";
import { useFileImport } from "./_hooks/useFileImport";
import { useTranslationSession } from "./_hooks/useTranslationSession";
import { toast } from "sonner";
import { parseGithubUrl, detectLanguageFromFilename, fetchGithubFileContent } from "@/lib/github-import";

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
  const currentSessionId = useTranslationStore((state) => state.sessionId);
  const { activeWorkspace } = useWorkspace();
  const { theme, systemTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");
  
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState("code-to-english");
  const [sourceLanguage, setSourceLanguage] = useState("python");
  const [targetLanguage, setTargetLanguage] = useState("javascript");
  const [viewType, setViewType] = useState<"editor" | "blocks" | "diff">("blocks");
  const [customInstructions, setCustomInstructions] = useState("");
  const [repositoryName, setRepositoryName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [gistSource, setGistSource] = useState<{ username: string; filename: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [saveRunToHistory, setSaveRunToHistory] = useState(false);

  useEffect(() => {
    setSaveRunToHistory(false);
  }, [session?.user?.id]);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const paramCode = searchParams.get("code");
    const paramLang = searchParams.get("lang");
    const paramMode = searchParams.get("mode");
    const paramFile = searchParams.get("file") || searchParams.get("github");

    if (paramCode) {
      useTranslationStore.getState().setInput(paramCode);
    }
    if (paramLang) {
      setSourceLanguage(paramLang);
    }
    if (paramMode) {
      setMode(paramMode);
    }
    if (paramFile) {
      try {
        const parsed = parseGithubUrl(paramFile);
        const detected = detectLanguageFromFilename(parsed.filename);
        setSourceLanguage(detected);
        setRepositoryName(`${parsed.owner}/${parsed.repo}`);
        setFilePath(parsed.filePath);
        setGistSource({ username: parsed.owner, filename: parsed.filename });
        toast.loading(`Importing ${parsed.filename} from GitHub...`, { id: "gh-deep-link" });
        fetchGithubFileContent(parsed.rawUrl)
          .then(({ content }) => {
            useTranslationStore.getState().setInput(content);
            toast.success(`Loaded ${parsed.filename} (${detected}) from GitHub!`, { id: "gh-deep-link" });
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : "Network error";
            toast.error(`GitHub Import Failed: ${msg}`, { id: "gh-deep-link" });
          });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid GitHub URL";
        toast.error(`GitHub URL error: ${msg}`);
      }
    }
  }, [searchParams]);

  // FIX-22 (P2-10): authFetcher is defined at module level in swr-fetcher.ts
  //   → SWR key is a stable [url, token] tuple; fetcher reference never changes.
  // Uses relative /api/... path — routed through Next.js proxy (next.config.ts rewrites).
  const { data: creditsData, isLoading: creditsLoading } = useSWR(
    session?.access_token ? ['/api/check-credits', session.access_token] : null,
    authFetcher,
  ) as { data: { credits?: number; tier?: string; protection_mode?: string } | undefined; isLoading: boolean };

  // FIX-21: session is now AnuvaadSession | null — no more (session as any)
  const credits = creditsData?.credits ?? session?.user?.user_metadata?.credits;
  const isPro = creditsData?.tier === "pro" || session?.user?.user_metadata?.is_pro === true;

  // M-1: monacoOptions is now the module-level MONACO_OPTIONS constant (no per-render allocation)

  const {
    handleTranslate,
    // M3 Feature #7: Quota exceeded modal state
    quotaError,
    setQuotaError,
    dismissQuotaError,
  } = useTranslationStream({
    mode,
    sourceLanguage,
    targetLanguage,
    customInstructions,
    activeWorkspace,
    isPro: isPro || false,
    session,
    repositoryName,
    filePath,
    selectedModel,
    skipAppHistory: !saveRunToHistory || !session?.access_token,
  });

  const handleClear = () => {
    const store = useTranslationStore.getState();
    store.setInput("");
    store.setOutputBlocks(null);
    store.setStreamText("");
    store.setRawError("");
  };

  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalReason, setGuestModalReason] = useState<"gist" | "save" | "export">("save");
  const [pendingGuestAction, setPendingGuestAction] = useState<(() => void) | null>(null);

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
  } = useFileImport({
    mode,
    setUploadedFile,
    setFilePath,
    setSourceLanguage,
    setGistSource,
    onQuotaExceeded: setQuotaError,
    accessToken: session?.access_token,
  });

  const {
    isSyncing,
    copied,
    hasEdits,
    handleSyncEnglishToCode,
    handleCopyMarkdown,
    handleCopyCode,
    handleExportCode,
    handleDownloadJson,
  } = useTranslationSession({
    sourceLanguage,
    targetLanguage,
    customInstructions,
    activeWorkspace,
    session,
    repositoryName,
    filePath,
    mode,
    skipAppHistory: !saveRunToHistory || !session?.access_token,
    onQuotaExceeded: setQuotaError,
    onSyncSuccess: () => setViewType("diff"),
  });

  const triggerGistImportWithGuestPrompt = () => {
    if (!session) {
      setGuestModalReason("gist");
      setPendingGuestAction(() => handleGistImport);
      setGuestModalOpen(true);
    } else {
      handleGistImport();
    }
  };

  const triggerSyncWithGuestPrompt = () => {
    if (!session) {
      setGuestModalReason("save");
      setPendingGuestAction(() => handleSyncEnglishToCode);
      setGuestModalOpen(true);
    } else {
      handleSyncEnglishToCode();
    }
  };

  const triggerExportWithGuestPrompt = () => {
    if (!session) {
      setGuestModalReason("export");
      setPendingGuestAction(() => handleDownloadJson);
      setGuestModalOpen(true);
    } else {
      handleDownloadJson();
    }
  };

  // Global hotkeys for Translate workspace
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Run translation: Cmd/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleTranslate();
        return;
      }

      // 2. Mode toggles: Alt + 1, Alt + 2, Alt + 3
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        setMode("code-to-english");
        return;
      }
      if (e.altKey && e.key === "2") {
        e.preventDefault();
        setMode("english-to-code");
        return;
      }
      if (e.altKey && e.key === "3") {
        e.preventDefault();
        setMode("code-to-code");
        return;
      }

      // 3. Clear: Ctrl + Alt + C
      if (e.ctrlKey && e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        handleClear();
        handleClearFile();
        return;
      }

      // 4. Copy Output: Cmd/Ctrl + Shift + C
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        handleCopyMarkdown();
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleTranslate, handleCopyMarkdown, handleClearFile]);

  // Calculate some derived props for TranslateShell header
  const currentModeLabel = mode === "code-to-english" 
    ? "Code to English" 
    : mode === "english-to-code" 
      ? "English to Code" 
      : "Code to Code";

  return (
    <>
      <SmartPasteListener />
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
        protectionMode={creditsData?.protection_mode}
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
          />
        }
        inputPanel={
          <InputPanel
            mode={mode}
            uploadedFile={uploadedFile}
            handleClearFile={handleClearFile}
            gistSource={gistSource}
            setGistSource={setGistSource}
            handleTranslate={handleTranslate}
            saveRunToHistory={saveRunToHistory}
            setSaveRunToHistory={setSaveRunToHistory}
            isSignedIn={!!session?.access_token}
            handleClear={() => {
              handleClear();
              handleClearFile();
            }}
            sourceLanguage={sourceLanguage}
            setSourceLanguage={setSourceLanguage}
            isDark={isDark}
            monacoOptions={MONACO_OPTIONS}
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
            handleGistImport={triggerGistImportWithGuestPrompt}
            fileList={fileList}
            repoInfo={repoInfo}
            handleSelectFile={handleSelectFile}
            setFileList={setFileList}
          />
        }
        outputPanel={
          <div className="flex flex-col h-full min-h-0">
            <ArtifactExportBar sourceLanguage={sourceLanguage} />
            <div className="flex-1 min-h-0">
              <OutputPanel
                mode={mode}
                viewType={viewType}
                setViewType={setViewType}
                handleCopyMarkdown={handleCopyMarkdown}
                handleCopyCode={handleCopyCode}
                handleExportCode={handleExportCode}
                copied={copied}
                handleDownloadJson={triggerExportWithGuestPrompt}
                hasEdits={hasEdits}
                isSyncing={isSyncing}
                handleSyncEnglishToCode={triggerSyncWithGuestPrompt}
                onRetry={handleTranslate}
                sessionId={currentSessionId}
                accessToken={session?.access_token ?? null}
                canShare={!!session?.access_token && saveRunToHistory}
                workspaceId={activeWorkspace?.id}
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                isDark={isDark}
                monacoOptions={MONACO_OPTIONS}
              />
            </div>
          </div>
        }
      />
      {/* M3 Feature #7: Quota Exceeded Modal — renders on top of everything when 429 fires */}
      <QuotaExceededModal error={quotaError} onClose={dismissQuotaError} />

      {/* M3 Feature #11: Streamlined Guest Onboarding Modal */}
      <GuestOnboardingModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        onContinueAsGuest={() => {
          if (pendingGuestAction) {
            pendingGuestAction();
            setPendingGuestAction(null);
          }
        }}
        reason={guestModalReason}
      />
    </>
  );
}

