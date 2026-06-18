import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Zap, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatInterface } from "./ChatInterface";

interface TranslateShellProps {
  currentModeLabel: string;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  isPro: boolean;
  creditsLoading: boolean;
  credits: number | undefined;
  customInstructions: string;
  setCustomInstructions: (val: string) => void;
  repositoryName: string;
  setRepositoryName: (val: string) => void;
  filePath: string;
  setFilePath: (val: string) => void;
  toolbar: React.ReactNode;
  inputPanel: React.ReactNode;
  outputPanel: React.ReactNode;
}

export function TranslateShell({
  currentModeLabel,
  showSettings,
  setShowSettings,
  isPro,
  creditsLoading,
  credits,
  customInstructions,
  setCustomInstructions,
  repositoryName,
  setRepositoryName,
  filePath,
  setFilePath,
  toolbar,
  inputPanel,
  outputPanel,
}: TranslateShellProps) {
  const [zenMode, setZenMode] = React.useState(false);

  return (
    <div className={cn("flex flex-col overflow-hidden relative transition-all duration-300", 
      zenMode ? "fixed inset-0 z-50 bg-background h-screen" : "h-screen"
    )}>
      <div className="apple-mesh-bg"></div>

      {/* ── Top bar ── */}
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="shrink-0 z-20 glass-apple border-b border-slate-200/50 dark:border-white/5"
      >
        <div className="flex h-14 items-center justify-between pl-14 pr-6 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold tracking-tight">Workspace</h1>
            <Badge variant="outline" className="text-[10px] font-medium bg-amber-500/5 text-amber-500 dark:text-amber-500/90 border-amber-500/20">{currentModeLabel}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="h-8 gap-2 hover:bg-slate-50 dark:hover:bg-amber-900/10 font-bold text-xs">
              <Settings className="h-4 w-4 text-amber-500" />
              <span>Instructions</span>
            </Button>
            {!isPro && (
               <Badge variant="outline" className="text-[10px] bg-amber-500/5 border-amber-500/20 text-amber-500 font-bold gap-1 px-2.5 py-0.5">
                 <Zap className="h-3 w-3 text-amber-500 animate-pulse" /> {creditsLoading ? "..." : credits} Credits
               </Badge>
            )}
            <Badge className={cn(
              "text-[10px] font-bold py-0.5 px-2.5",
              isPro
                ? "bg-amber-500/10 text-amber-500 dark:text-amber-500 border border-amber-500/20 hover:bg-amber-500/10"
                : "bg-muted text-muted-foreground hover:bg-muted"
            )}>
              {isPro ? "✦ Pro" : "Free Plan"}
            </Badge>
          </div>
        </div>
      </motion.header>

      {/* ── Custom instructions panel (slides in below header) ── */}
      {showSettings && (
        <div className="shrink-0 border-b border-slate-200 dark:border-amber-500/10 bg-slate-50/50 dark:bg-surface-charcoal/50 px-6 py-4 animate-in slide-in-from-top duration-250">
          <div className="max-w-3xl">
            <label htmlFor="custom-instructions" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8494b0]">
              Corporate Standards / Custom Instructions
            </label>
            <Input
              id="custom-instructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Strictly enforce JSDoc comments. Use functional components only."
              className="text-sm bg-background border-slate-200 dark:border-amber-500/20 focus-visible:ring-amber-500"
            />
            <p className="mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-relaxed">
              These instructions are appended to the AI prompt to enforce specific corporate coding standards, structural styles, or target frameworks.
            </p>

            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8494b0]">
                  Repository / Project Name
                </label>
                <Input
                  value={repositoryName}
                  onChange={(e) => setRepositoryName(e.target.value)}
                  placeholder="e.g. anuvaad-frontend"
                  className="text-sm bg-background border-slate-200 dark:border-amber-500/20 focus-visible:ring-amber-500"
                />
              </div>
              <div className="flex-1">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8494b0]">
                  File Path
                </label>
                <Input
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="e.g. src/app/page.tsx"
                  className="text-sm bg-background border-slate-200 dark:border-amber-500/20 focus-visible:ring-amber-500"
                />
              </div>
            </div>
            <p className="mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-relaxed">
              Providing repository and file path links this session for continuity.
            </p>
          </div>
        </div>
      )}

      {/* ── Mode + language toolbar ── */}
      {toolbar}

      {/* ── Main split workspace — fills all remaining height ── */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 pt-2">
        {/* ── macOS-style window chrome + split grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-surface-charcoal/50 glass-apple rounded-xl shadow-2xl border border-white/20 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/10"
        >
          {/* Title bar */}
          <div className="shrink-0 h-10 border-b border-border-subtle flex items-center justify-between px-4 relative bg-surface-base group">
            <div className="flex-1"></div>
            <div className="text-center text-xs font-semibold text-text-secondary select-none">
              Translation Workspace
            </div>
            <div className="flex-1 flex justify-end">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                onClick={() => setZenMode(!zenMode)}
                title={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
              >
                {zenMode ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Split grid — both columns fill the remaining height */}
          <div className="flex-1 overflow-y-auto lg:overflow-hidden grid lg:grid-cols-2 lg:divide-x divide-y lg:divide-y-0 divide-slate-200/50 dark:divide-white/5">
            {inputPanel}
            {outputPanel}
          </div>
        </motion.div>
      </div>

      {/* ── Conversational AI Chat ── */}
      <ChatInterface />
    </div>
  );
}
