import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatInterface } from "./ChatInterface";
import { Sidebar } from "./Sidebar";

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
  protectionMode?: string;
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
  protectionMode,
}: TranslateShellProps) {
  const [zenMode, setZenMode] = React.useState(false);
  const [activePane, setActivePane] = React.useState<"input" | "output">("input");
  // Re-using showSettings as sidebar collapsed state, inverted
  const sidebarCollapsed = !showSettings;
  const setSidebarCollapsed = (collapsed: boolean) => setShowSettings(!collapsed);

  return (
    <div className={cn("flex flex-col overflow-hidden relative transition-all duration-300", 
      zenMode ? "fixed inset-0 z-50 bg-background h-screen" : "h-screen"
    )}>
      {/* ── Top bar ── */}
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="shrink-0 z-20 bg-background/95 backdrop-blur-md border-b border-border"
      >
        <div className="flex h-14 items-center justify-between pl-4 pr-6 md:px-6">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-bold tracking-tight ml-2 font-mono uppercase text-slate-900 dark:text-white">
              Translation studio
            </h1>
            <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
            </span>
            <Badge variant="outline" className="text-[10px] font-mono font-medium bg-amber-500/5 text-amber-500 dark:text-amber-400 border-amber-500/20">{currentModeLabel}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Protection Mode Indicator Pill */}
            {protectionMode && protectionMode !== "NORMAL" ? (
              <span className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border shadow-xs",
                protectionMode === "EMERGENCY" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
                protectionMode === "RESTRICTED" && "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
                protectionMode === "CAUTION" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
              )}>
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                {protectionMode} Mode
              </span>
            ) : (
              <a href="/privacy" className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500 underline decoration-amber-500 underline-offset-4 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                Privacy details
              </a>
            )}

            {/* Topbar Pro Badge moved here instead of old places */}
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

      {/* ── Mode + language toolbar ── */}
      {toolbar}

      {/* ── Main Workspace Row ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        {!zenMode && (
          <Sidebar
            isPro={isPro}
            creditsLoading={creditsLoading}
            credits={credits}
            customInstructions={customInstructions}
            setCustomInstructions={setCustomInstructions}
            repositoryName={repositoryName}
            setRepositoryName={setRepositoryName}
            filePath={filePath}
            setFilePath={setFilePath}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
        )}

        {/* ── Main split workspace ── */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 pt-2">
          {/* ── macOS-style window chrome + split grid ── */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 overflow-hidden flex flex-col bg-background/50 glass-apple rounded-xl shadow-2xl border border-border ring-1 ring-border"
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
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  onClick={() => setZenMode(!zenMode)}
                  aria-label={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
                  title={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
                >
                  {zenMode ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 border-b border-border p-2 lg:hidden" role="tablist" aria-label="Translation panes">
              <button type="button" role="tab" id="input-pane-tab" aria-controls="input-pane" aria-selected={activePane === "input"} onClick={() => setActivePane("input")} className={cn("min-h-10 flex-1 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500", activePane === "input" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "text-muted-foreground hover:bg-muted")}>Input</button>
              <button type="button" role="tab" id="output-pane-tab" aria-controls="output-pane" aria-selected={activePane === "output"} onClick={() => setActivePane("output")} className={cn("min-h-10 flex-1 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500", activePane === "output" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "text-muted-foreground hover:bg-muted")}>Output</button>
            </div>

            {/* Mobile uses one editor pane at a time; wide screens show both. */}
            <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 grid-rows-1 lg:grid-cols-2 lg:divide-x divide-border">
              <div id="input-pane" role="tabpanel" aria-labelledby="input-pane-tab" className={cn("h-full min-h-0 [grid-area:1/1] lg:[grid-area:auto]", activePane === "input" ? "" : "hidden lg:block")}>
                {inputPanel}
              </div>
              <div id="output-pane" role="tabpanel" aria-labelledby="output-pane-tab" className={cn("h-full min-h-0 [grid-area:1/1] lg:[grid-area:auto]", activePane === "output" ? "" : "hidden lg:block")}>
                {outputPanel}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Conversational AI Chat ── */}
      <ChatInterface />
    </div>
  );
}
