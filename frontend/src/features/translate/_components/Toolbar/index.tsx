import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { modes } from "../../_constants/modes";
import { languages } from "../../_constants/languages";
import { SearchableLanguageSelect } from "./SearchableLanguageSelect";
import { RepositorySelector } from "./RepositorySelector";
import { ModelSelect } from "./ModelSelect";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  selectedModel: string;
  onModelChange: (modelId: string) => void;
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
  selectedModel,
  onModelChange,
  onSwapContent,
}: ToolbarProps) {
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
    <div className="shrink-0 z-10 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 border-b border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-surface-charcoal/60 backdrop-blur-md">
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

      {/* Controls: Model Select, Language Selectors, Swap Button & Repo Selector */}
      <div className="flex flex-wrap items-center gap-2.5">
        <ModelSelect selectedModel={selectedModel} onModelChange={onModelChange} />

        <div className="h-6 w-px bg-slate-200/50 dark:bg-white/10 hidden sm:block mx-0.5" />

        {mode !== "english-to-code" && (
          <SearchableLanguageSelect
            label="Source"
            value={sourceLanguage}
            onChange={setSourceLanguage}
          />
        )}

        {mode === "code-to-code" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwapLanguages}
            aria-label="Swap source and target languages"
            title="Swap source and target languages"
            className="h-8 w-8 p-0 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 text-slate-500 dark:text-slate-400 transition-colors"
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

        <div className="h-6 w-px bg-slate-200/50 dark:bg-white/10 hidden sm:block mx-0.5" />

        <RepositorySelector
          repositoryName={repositoryName}
          setRepositoryName={setRepositoryName}
          filePath={filePath}
          setFilePath={setFilePath}
        />
      </div>
    </div>
  );
}
