import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isPro: boolean;
  creditsLoading: boolean;
  credits: number | undefined;
  customInstructions: string;
  setCustomInstructions: (val: string) => void;
  repositoryName: string;
  setRepositoryName: (val: string) => void;
  filePath: string;
  setFilePath: (val: string) => void;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

export function Sidebar({
  isPro,
  creditsLoading,
  credits,
  customInstructions,
  setCustomInstructions,
  repositoryName,
  setRepositoryName,
  filePath,
  setFilePath,
  collapsed,
  setCollapsed,
}: SidebarProps) {
  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 64 : 320 }}
      className="shrink-0 h-full bg-card border-r border-border flex flex-col transition-colors relative z-20"
    >
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="font-bold text-sm">Settings</span>
            <Badge className={cn(
              "text-[10px] font-bold py-0.5 px-2",
              isPro
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : "bg-muted text-muted-foreground"
            )}>
              {isPro ? "✦ Pro" : "Free Plan"}
            </Badge>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-6"
            >
              {!isPro && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-500 flex items-center gap-2">
                    <Zap className="h-4 w-4 animate-pulse" /> Credits
                  </span>
                  <span className="text-sm font-bold text-amber-500">
                    {creditsLoading ? "..." : credits}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Custom Instructions
                  </label>
                  <Input
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Use functional components..."
                    className="text-sm bg-background/50 border-input"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Repository Name
                  </label>
                  <Input
                    value={repositoryName}
                    onChange={(e) => setRepositoryName(e.target.value)}
                    placeholder="e.g. anuvaad-frontend"
                    className="text-sm bg-background/50 border-input"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    File Path
                  </label>
                  <Input
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="e.g. src/app/page.tsx"
                    className="text-sm bg-background/50 border-input"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-4 mt-2"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500" title="Settings">
                <Settings className="h-5 w-5" />
              </div>
              {!isPro && (
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500" title={`${credits} Credits`}>
                  <Zap className="h-5 w-5" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
