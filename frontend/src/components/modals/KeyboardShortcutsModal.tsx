"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard, Command, Sparkles, Terminal, FileCode, ArrowLeftRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutGroup {
  category: string;
  icon: React.ElementType;
  items: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: "General & Navigation",
    icon: Command,
    items: [
      { keys: ["⌘ / Ctrl", "K"], description: "Open Command Palette & Quick Search" },
      { keys: ["?"], description: "Show Keyboard Shortcuts Guide" },
      { keys: ["Esc"], description: "Close Active Modal, Palette or Dropdown" },
    ],
  },
  {
    category: "Translation Execution",
    icon: Sparkles,
    items: [
      { keys: ["⌘ / Ctrl", "Enter"], description: "Run Translation / Comprehension" },
      { keys: ["Ctrl", "Alt", "C"], description: "Clear Source Code & Output" },
      { keys: ["⌘ / Ctrl", "Shift", "C"], description: "Copy Translated Output to Clipboard" },
      { keys: ["⌘ / Ctrl", "Shift", "S"], description: "Swap Source & Target Languages (Code-to-Code)" },
    ],
  },
  {
    category: "Modes & Workspaces",
    icon: FileCode,
    items: [
      { keys: ["Alt", "1"], description: "Switch to Code → English Comprehension" },
      { keys: ["Alt", "2"], description: "Switch to English → Code Synthesis" },
      { keys: ["Alt", "3"], description: "Switch to Code → Code Transpilation" },
    ],
  },
  {
    category: "Monaco Editor Hotkeys",
    icon: Terminal,
    items: [
      { keys: ["⌘ / Ctrl", "F"], description: "Find & Replace in Active Code Buffer" },
      { keys: ["Alt", "Shift", "F"], description: "Format Code Indentation & Brackets" },
      { keys: ["⌘ / Ctrl", "/"], description: "Toggle Line Comment" },
      { keys: ["Tab"], description: "Indent Code Block" },
      { keys: ["Shift", "Tab"], description: "Outdent Code Block" },
    ],
  },
];

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing inside an input or textarea
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (e.key === "?" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    const handleCustomEvent = () => setOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-keyboard-shortcuts", handleCustomEvent);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-keyboard-shortcuts", handleCustomEvent);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Keyboard className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight">
                  Keyboard Shortcuts
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Boost your translation and editing velocity with system hotkeys
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {SHORTCUT_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.category} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <Icon className="h-3.5 w-3.5 text-amber-500" />
                  <span>{group.category}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40"
                    >
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((key, kIdx) => (
                          <React.Fragment key={kIdx}>
                            {kIdx > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">+</span>
                            )}
                            <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">?</kbd> anywhere to re-open this reference
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-medium text-amber-500 hover:text-amber-600 cursor-pointer"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
