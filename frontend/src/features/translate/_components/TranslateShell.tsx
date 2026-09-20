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
  // Re-using showSettings as sidebar collapsed state, inverted
  const sidebarCollapsed = !showSettings;
  const setSidebarCollapsed = (collapsed: boolean) => setShowSettings(!collapsed);

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
        className="shrink-0 z-20 glass-apple border-b border-border"
      >
        <div className="flex h-14 items-center justify-between pl-4 pr-6 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold tracking-tight ml-2">Workspace</h1>
            <Badge variant="outline" className="text-[10px] font-medium bg-amber-500/5 text-amber-500 dark:text-amber-500/90 border-amber-500/20">{currentModeLabel}</Badge>
          </div>
          <div className="flex items-center gap-2">
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
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                  onClick={() => setZenMode(!zenMode)}
                  aria-label={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
                  title={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
                >
                  {zenMode ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {/* Split grid — both columns fill the remaining height */}
            <div className="flex-1 overflow-y-auto lg:overflow-hidden grid lg:grid-cols-2 lg:divide-x divide-y lg:divide-y-0 divide-border">
              {inputPanel}
              {outputPanel}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Conversational AI Chat ── */}
      <ChatInterface />
    </div>
  );
}
