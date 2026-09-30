"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";

function useSafeWorkspace() {
  try {
    return useWorkspace();
  } catch {
    return {
      workspaces: [],
      activeWorkspace: null,
      setActiveWorkspace: () => {},
      refreshWorkspaces: async () => {},
      loading: false,
    };
  }
}
import { useTranslationStore } from "@/features/translate/_store/useTranslationStore";
import {
  Code2,
  History,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Briefcase,
  Sparkles,
  GitPullRequest,
  CreditCard,
  Settings,
  Keyboard,
} from "lucide-react";
import { toast } from "sonner";

interface CodePreset {
  id: string;
  title: string;
  lang: string;
  mode: string;
  code: string;
}

const PRESET_TEMPLATES: CodePreset[] = [
  {
    id: "rust-memory",
    title: "Explain Rust Memory Safety & Borrow Checker",
    lang: "rust",
    mode: "code-to-english",
    code: `pub struct SharedBuffer<T> {\n    data: Arc<RwLock<Vec<T>>>,\n}\nimpl<T: Clone + Send + Sync> SharedBuffer<T> {\n    pub async fn push(&self, item: T) {\n        let mut guard = self.data.write().await;\n        guard.push(item);\n    }\n}`,
  },
  {
    id: "react-to-go",
    title: "Transpile React Hook to Go Goroutine Worker",
    lang: "go",
    mode: "code-to-code",
    code: `func StartPollWorker(ctx context.Context, interval time.Duration, out chan<- Metric) {\n    ticker := time.NewTicker(interval)\n    defer ticker.Stop()\n    for {\n        select {\n        case <-ctx.Done():\n            return\n        case <-ticker.C:\n            out <- FetchSystemMetrics()\n        }\n    }\n}`,
  },
  {
    id: "numpy-vector",
    title: "Vectorize Python Loop with NumPy SIMD",
    lang: "python",
    mode: "code-to-code",
    code: `import numpy as np\n\ndef compute_pairwise_distances(A: np.ndarray, B: np.ndarray) -> np.ndarray:\n    # Vectorized Euclidean distance matrix computation\n    return np.sqrt(np.sum((A[:, np.newaxis, :] - B[np.newaxis, :, :]) ** 2, axis=-1))`,
  },
  {
    id: "sql-breakdown",
    title: "Explain Complex SQL Window Function",
    lang: "sql",
    mode: "code-to-english",
    code: `WITH ranked_orders AS (\n  SELECT user_id, order_id, total_amount,\n         DENSE_RANK() OVER (PARTITION BY user_id ORDER BY total_amount DESC) as rank\n  FROM orders\n  WHERE created_at >= NOW() - INTERVAL '30 days'\n)\nSELECT * FROM ranked_orders WHERE rank <= 3;`,
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const { signOut } = useAuth();
  const { workspaces, setActiveWorkspace } = useSafeWorkspace();

  // Toggle on ⌘K / Ctrl+K or custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const loadPreset = (preset: CodePreset) => {
    runCommand(() => {
      useTranslationStore.getState().setInput(preset.code);
      router.push(`/dashboard/translate?lang=${preset.lang}&mode=${preset.mode}`);
      toast.success(`Loaded preset: ${preset.title}`);
    });
  };

  const openShortcuts = () => {
    runCommand(() => {
      window.dispatchEvent(new CustomEvent("open-keyboard-shortcuts"));
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-150">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-md">
        <Command
          className="flex h-full w-full flex-col overflow-hidden bg-transparent"
          label="Global Command Menu"
        >
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <Command.Input
              autoFocus
              className="flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100 font-sans"
              placeholder="Type a command, search pages, or load translation presets..."
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800/50">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-[380px] overflow-y-auto overflow-x-hidden p-2 space-y-1">
            <Command.Empty className="py-8 text-center text-sm text-slate-500">
              No matching commands found.
            </Command.Empty>

            {/* Quick Templates & Presets */}
            <Command.Group
              heading="Code Translation Presets"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              {PRESET_TEMPLATES.map((preset) => (
                <Command.Item
                  key={preset.id}
                  onSelect={() => loadPreset(preset)}
                  className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
                >
                  <Sparkles className="mr-2.5 h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="flex-1 truncate">{preset.title}</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase ml-2 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {preset.lang}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Navigation Group */}
            <Command.Group
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider mt-2"
            >
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/translate"))}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <Code2 className="mr-2.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Code Translator Workspace</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/pr-review"))}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <GitPullRequest className="mr-2.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>PR Review & Architectural Risk</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/history"))}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <History className="mr-2.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Translation History</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <Settings className="mr-2.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Settings & API Keys</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/billing"))}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <CreditCard className="mr-2.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Subscription & Billing</span>
              </Command.Item>
            </Command.Group>

            {/* Quick Actions & Help */}
            <Command.Group
              heading="Help & Hotkeys"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider mt-2"
            >
              <Command.Item
                onSelect={openShortcuts}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <Keyboard className="mr-2.5 h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>View Keyboard Shortcuts</span>
                <kbd className="ml-auto font-mono text-[10px] text-slate-400">?</kbd>
              </Command.Item>
            </Command.Group>

            {/* Workspaces Group */}
            <Command.Group
              heading="Workspaces"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider mt-2"
            >
              <Command.Item
                onSelect={() =>
                  runCommand(() => {
                    setActiveWorkspace(null);
                    router.push("/dashboard");
                  })
                }
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <Briefcase className="mr-2.5 h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Personal Workspace</span>
              </Command.Item>
              {workspaces.map((w) => (
                <Command.Item
                  key={w.id}
                  onSelect={() =>
                    runCommand(() => {
                      setActiveWorkspace(w);
                      router.push("/dashboard");
                    })
                  }
                  className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
                >
                  <Briefcase className="mr-2.5 h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Switch to: {w.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Theme Group */}
            <Command.Group
              heading="Appearance"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider mt-2"
            >
              <Command.Item
                onSelect={() => runCommand(() => setTheme("light"))}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <Sun className="mr-2.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Light Theme</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => setTheme("dark"))}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <Moon className="mr-2.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Dark Theme (Developer Console)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => setTheme("system"))}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-amber-500/10 aria-selected:text-amber-600 dark:aria-selected:text-amber-400 text-slate-700 dark:text-slate-300"
              >
                <Monitor className="mr-2.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>System Preference</span>
              </Command.Item>
            </Command.Group>

            {/* Account Group */}
            <Command.Group
              heading="Session"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider mt-2"
            >
              <Command.Item
                onSelect={() => runCommand(() => signOut())}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-medium outline-none transition-colors aria-selected:bg-rose-500/15 aria-selected:text-rose-600 dark:aria-selected:text-rose-400 text-slate-700 dark:text-slate-300"
              >
                <LogOut className="mr-2.5 h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span>Sign Out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
