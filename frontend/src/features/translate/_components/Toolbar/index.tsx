import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { modes } from "../../_constants/modes";
import { SearchableLanguageSelect } from "./SearchableLanguageSelect";

interface ToolbarProps {
  mode: string;
  setMode: (mode: string) => void;
  sourceLanguage: string;
  setSourceLanguage: (lang: string) => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
}

export function Toolbar({
  mode,
  setMode,
  sourceLanguage,
  setSourceLanguage,
  targetLanguage,
  setTargetLanguage,
}: ToolbarProps) {
  return (
    <div className="shrink-0 z-10 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 border-b border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-surface-charcoal/60 backdrop-blur-md">
      {/* Mode tabs */}
      <div role="tablist" aria-label="Translation modes" className="macos-segmented-track w-fit shadow-sm">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => {
                const prevMode = mode;
                setMode(m.id);
                if (prevMode !== m.id) {
                  track("mode_switched", { from_mode: prevMode, to_mode: m.id });
                }
              }}
              className={cn(
                "flex items-center gap-2 macos-segmented-item",
                mode === m.id ? "active" : ""
              )}>
              <Icon className="h-3.5 w-3.5" />{m.label}
            </button>
          );
        })}
      </div>

      {/* Language selectors */}
      <div className="flex flex-wrap items-center gap-3">
        {mode !== "english-to-code" && (
          <SearchableLanguageSelect
            label="Source"
            value={sourceLanguage}
            onChange={setSourceLanguage}
          />
        )}
        {mode !== "code-to-english" && (
          <SearchableLanguageSelect
            label="Target"
            value={targetLanguage}
            onChange={setTargetLanguage}
          />
        )}
      </div>
    </div>
  );
}
