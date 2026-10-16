import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { modes } from "../../_constants/modes";
import { languages } from "../../_constants/languages";
import { SearchableLanguageSelect } from "./SearchableLanguageSelect";
import { RepositorySelector } from "./RepositorySelector";
import { ModelSelect } from "./ModelSelect";
import { EngineModeSelector } from "./EngineModeSelector";
import { DepthSlider } from "./DepthSlider";
import { ArrowLeftRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useSWR from "swr";

interface LanguageSupportResponse {
  language: string;
  syntax_validation_available: boolean;
}

const fetchLanguageSupport = async (url: string): Promise<LanguageSupportResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not check parser availability");
  return response.json();
};

interface ToolbarProps {
  mode: string;
  setMode: (mode: string) => void;
  sourceLanguage: string;
  setSourceLanguage: (lang: string) => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  repositoryName: string;
  setRepositoryName: (name: string) => void;
  filePath: string;
  setFilePath: (path: string) => void;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  onSwapContent?: () => void;
}

export function Toolbar({
  mode,
  setMode,
  sourceLanguage,
  setSourceLanguage,
  targetLanguage,
  setTargetLanguage,
  repositoryName,
  setRepositoryName,
  filePath,
  setFilePath,
  selectedModel = "groq-llama-3.3-70b",
  onModelChange = () => {},
  onSwapContent,
}: ToolbarProps) {
  const languageToCheck = mode === "code-to-english" ? sourceLanguage : targetLanguage;
  const { data: languageSupport, isLoading: isCheckingLanguageSupport, error: languageSupportError } = useSWR<LanguageSupportResponse>(
    `/api/v1/public/language-support?language=${encodeURIComponent(languageToCheck)}`,
    fetchLanguageSupport,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );
  const languageSupportLabel = isCheckingLanguageSupport
    ? "Checking parser…"
    : languageSupportError || !languageSupport
      ? "Parser status unavailable"
      : mode === "code-to-english"
        ? languageSupport.syntax_validation_available ? "Parser available" : "Parser unavailable"
        : languageSupport.syntax_validation_available ? "Syntax check available" : "Syntax check unavailable";

  const handleSwapLanguages = () => {
    if (mode !== "code-to-code") return;
    const prevSource = sourceLanguage;
    const prevTarget = targetLanguage;
    setSourceLanguage(prevTarget);
    setTargetLanguage(prevSource);
    if (onSwapContent) {
      onSwapContent();
    }
    const srcLabel = languages.find((l) => l.value === prevTarget)?.label || prevTarget;
    const tgtLabel = languages.find((l) => l.value === prevSource)?.label || prevSource;
    toast.success(`Swapped languages: ${srcLabel} ↔ ${tgtLabel}`);
  };

  return (
    <div className="shrink-0 z-10 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 border-b border-border bg-background/60 backdrop-blur-md">
      {/* Mode tabs */}
      <div role="tablist" aria-label="Translation modes" className="macos-segmented-track w-fit shadow-sm">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => {
                const prevMode = mode;
                setMode(m.id);
                if (prevMode !== m.id) {
                  track("mode_switched", { from_mode: prevMode, to_mode: m.id });
                }
              }}
              className={cn(
                "flex items-center gap-2 macos-segmented-item",
                mode === m.id ? "active" : ""
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Controls: Model Select, Engine Mode Selector, Language Selectors, Swap Button & Repo Selector */}
      <div className="flex flex-wrap items-center gap-2.5">
        <EngineModeSelector />
        <div className="h-6 w-px bg-border hidden sm:block mx-0.5" />
        <DepthSlider />
        <ModelSelect selectedModel={selectedModel} onModelChange={onModelChange} />

        <div className="h-6 w-px bg-border hidden sm:block mx-0.5" />

        {mode !== "english-to-code" && (
          <SearchableLanguageSelect
            label="Source"
            value={sourceLanguage}
            onChange={setSourceLanguage}
          />
        )}

        <span
          role="status"
          aria-live="polite"
          title="Parser availability indicates syntax-check capability only; it does not verify behavior or correctness."
          className={cn(
            "rounded-md border px-2 py-1 text-[10px] font-medium",
            isCheckingLanguageSupport || !languageSupport
              ? "border-border text-muted-foreground"
              : languageSupport.syntax_validation_available
                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : "border-amber-500/30 text-amber-700 dark:text-amber-400",
          )}
        >
          {languageSupportLabel}
        </span>

        {mode === "code-to-code" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwapLanguages}
            aria-label="Swap source and target languages"
            title="Swap source and target languages"
            className="h-8 w-8 p-0 rounded-xl hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </Button>
        )}

        {mode !== "code-to-english" && (
          <SearchableLanguageSelect
            label="Target"
            value={targetLanguage}
            onChange={setTargetLanguage}
          />
        )}

        <div className="h-6 w-px bg-border hidden sm:block mx-0.5" />

        <RepositorySelector
          repositoryName={repositoryName}
          setRepositoryName={setRepositoryName}
          filePath={filePath}
          setFilePath={setFilePath}
        />

        <div className="h-6 w-px bg-border hidden sm:block mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent("open-keyboard-shortcuts"))}
          aria-label="Keyboard Shortcuts (?)"
          title="Keyboard Shortcuts (?)"
          className="h-8 w-8 p-0 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 text-muted-foreground transition-colors cursor-pointer"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
