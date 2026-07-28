"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Cpu, Sparkles, Zap, Brain, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LLM_MODELS, LLMModel } from "../../_constants/models";
import { toast } from "sonner";

interface ModelSelectProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelect({ selectedModel, onModelChange }: ModelSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeModel = LLM_MODELS.find((m) => m.id === selectedModel) || LLM_MODELS[0];

  const getProviderIcon = (provider: LLMModel["provider"]) => {
    switch (provider) {
      case "Groq":
        return <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
      case "DeepSeek":
        return <Cpu className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
      case "OpenRouter":
        return <Brain className="h-3.5 w-3.5 text-purple-400 shrink-0" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all duration-200",
          "bg-white/80 dark:bg-surface-mid/80 hover:bg-slate-50 dark:hover:bg-surface-high hover:border-amber-500/30 dark:hover:border-amber-500/30",
          open && "border-amber-500/50 ring-2 ring-amber-500/20"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select LLM model"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {getProviderIcon(activeModel.provider)}
          <span className="truncate font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100">
            {activeModel.name}
          </span>
          <span className="hidden xl:inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
            {activeModel.badge}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0",
            open && "rotate-180 text-amber-500"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-surface-charcoal/95 backdrop-blur-xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              LLM Model Architecture
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Choose engine for code translation & SSE streaming
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 custom-scrollbar">
            {LLM_MODELS.map((model) => {
              const isSelected = model.id === selectedModel;
              return (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onModelChange(model.id);
                    setOpen(false);
                    toast.success(`Model switched to ${model.name}`);
                  }}
                  className={cn(
                    "flex items-start gap-2.5 w-full p-2.5 rounded-lg text-left transition-colors duration-150 group",
                    isSelected
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {getProviderIcon(model.provider)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold font-mono truncate text-slate-800 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                        {model.name}
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 shrink-0">
                        {model.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {model.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-amber-500 shrink-0 self-center ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
