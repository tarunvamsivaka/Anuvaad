"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Code2, FileText, ArrowLeftRight, Trash2, Calendar, Hash, Filter, Share2, Check } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";

const modeIcons = {
  "Code → English": FileText,
  "English → Code": Code2,
  "Code → Code": ArrowLeftRight,
};

const modeColors: Record<string, string> = {
  "Code → English": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "English → Code": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Code → Code": "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

interface HistoryItem {
  id: string;
  input_preview: string;
  source_language: string;
  target_language: string;
  mode: string;
  char_count: number;
  created_at: string;
  model_used: string;
  is_public?: boolean;
}

function getRelativeTimeString(date: Date | string): string {
  try {
    const timeMs = typeof date === "string" ? new Date(date).getTime() : date.getTime();
    const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);
    const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];
    const units: Intl.RelativeTimeFormatUnit[] = ["second", "minute", "hour", "day", "week", "month", "year"];
    const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(deltaSeconds));
    const divider = unitIndex ? cutoffs[unitIndex - 1] : 1;
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    return rtf.format(Math.floor(deltaSeconds / divider), units[unitIndex]);
  } catch {
    return "Just now";
  }
}

function groupByDate(items: HistoryItem[]): { label: string; items: HistoryItem[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups: { label: string; items: HistoryItem[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Older", items: [] },
  ];

  for (const item of items) {
    const d = new Date(item.created_at).getTime();
    if (d >= today) groups[0].items.push(item);
    else if (d >= yesterday) groups[1].items.push(item);
    else if (d >= weekAgo) groups[2].items.push(item);
    else groups[3].items.push(item);
  }

  return groups.filter(g => g.items.length > 0);
}

const ALL_MODES = ["All", "Code → English", "English → Code", "Code → Code"];

export default function HistoryPage() {
  const { session } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeMode, setActiveMode] = useState("All");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function fetchHistory() {
      if (!session?.access_token) {
        if (active) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const url = activeWorkspace 
          ? `${API}/api/history?workspace_id=${activeWorkspace.id}`
          : `${API}/api/history`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 401 || res.status === 403) {
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch history");
        const data: HistoryItem[] = await res.json();
        if (active) setHistory(data.slice(0, 50));
      } catch (err) {
        if (!active) return;
        if (err instanceof Error && err.name === "AbortError") return;
        toast.error("Failed to load translation history.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchHistory();
    return () => { active = false; controller.abort(); };
  }, [session?.access_token, activeWorkspace?.id]);

  const filteredHistory = useMemo(() => {
    let items = history;
    if (activeMode !== "All") items = items.filter(i => i.mode === activeMode);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(
        i =>
          i.input_preview?.toLowerCase().includes(q) ||
          i.source_language?.toLowerCase().includes(q) ||
          i.target_language?.toLowerCase().includes(q) ||
          i.mode?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [history, debouncedSearch, activeMode]);

  const grouped = useMemo(() => groupByDate(filteredHistory), [filteredHistory]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const previousHistory = history;
    setHistory(prev => prev.filter(item => item.id !== id));
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/history/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      setHistory(previousHistory);
      toast.error("Failed to delete translation. Please try again.");
    }
  const handleShare = async (e: React.MouseEvent, id: string, is_public?: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    if (is_public) {
      // Already public, just copy link
      const url = `${window.location.origin}/share/${id}`;
      navigator.clipboard.writeText(url);
      toast.success("Public link copied to clipboard!");
      return;
    }
    
    // Make public
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/history/${id}/share`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_public: true })
      });
      if (!res.ok) throw new Error("Share failed");
      
      setHistory(prev => prev.map(item => item.id === id ? { ...item, is_public: true } : item));
      const url = `${window.location.origin}/share/${id}`;
      navigator.clipboard.writeText(url);
      toast.success("Made public! Link copied to clipboard!");
    } catch {
      toast.error("Failed to share translation. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-amber-500/8 bg-white/80 dark:bg-[#080c14]/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <History className="h-4 w-4 text-amber-500" />
            <h1 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
              Translation History
            </h1>
          </div>
          {!loading && (
            <Badge className="text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5">
              {filteredHistory.length} {history.length === 50 ? "recent" : "total"}
            </Badge>
          )}
        </div>
      </header>

      <div className="p-5 lg:p-6 max-w-4xl mx-auto space-y-5">
        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-600" />
            <Input
              aria-label="Search translations"
              placeholder="Search translations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white dark:bg-[#0c0f1a] border-slate-200 dark:border-amber-500/10 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-xl focus:border-amber-500/40 focus:ring-amber-500/20"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {ALL_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap",
                    activeMode === mode
                      ? "bg-amber-500 text-slate-950"
                      : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-500 hover:border-amber-500/20 hover:text-amber-500"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div aria-live="polite" className="sr-only">
          {!loading && `${filteredHistory.length} results found`}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-xl dark:bg-white/4" />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-slate-200 dark:border-amber-500/10 rounded-2xl bg-amber-500/2">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/8 border border-amber-500/15">
              <Code2 className="h-6 w-6 text-amber-500/60" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No translations found</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-400 dark:text-slate-600">
              {search || activeMode !== "All"
                ? "Try a different search or filter."
                : "Your translation history will appear here."}
            </p>
            {!search && activeMode === "All" && (
              <Link
                href="/dashboard/translate"
                className={cn(buttonVariants({ size: "sm" }), "mt-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 rounded-lg")}
              >
                <Code2 className="h-3.5 w-3.5" /> Start Translating
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                {/* Group header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-500">{label}</span>
                  </div>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600">{items.length} items</span>
                </div>

                <div className="space-y-2">
                  {items.map(item => {
                    const Icon = modeIcons[item.mode as keyof typeof modeIcons] || FileText;
                    const modeCls = modeColors[item.mode] || "bg-slate-500/10 text-slate-400 border-slate-500/20";
                    const langLabel = item.mode === "Code → Code"
                      ? `${item.source_language} → ${item.target_language}`
                      : (item.source_language || item.target_language);

                    return (
                      <Card
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 dark:bg-[#0c0f1a] border border-slate-100 dark:border-amber-500/8 hover:border-amber-500/20 rounded-xl transition-all group"
                      >
                        {/* Mode icon */}
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                          modeCls
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-mono font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            {item.input_preview || "Code Snippet"}...
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] font-bold px-1.5 py-0", modeCls)}
                            >
                              {item.mode}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wide">
                              {langLabel}
                            </span>
                            {item.model_used && (
                              <span className="text-[9px] text-slate-400 dark:text-slate-700 border border-slate-200 dark:border-white/5 px-1.5 py-0.5 rounded-md font-mono">
                                {item.model_used}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1 border-t sm:border-t-0 border-slate-100 dark:border-white/5 pt-3 sm:pt-0 mt-1 sm:mt-0">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-600">
                            <Hash className="h-3 w-3" />
                            {item.char_count?.toLocaleString() || 0} chars
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">
                            {getRelativeTimeString(item.created_at)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Share translation"
                            className={cn("h-8 w-8 shrink-0 hover:bg-blue-500/10 transition-all rounded-lg", item.is_public ? "text-blue-500 opacity-100" : "text-slate-300 dark:text-slate-700 hover:text-blue-400 opacity-0 group-hover:opacity-100 focus:opacity-100")}
                            onClick={e => handleShare(e, item.id, item.is_public)}
                          >
                            {item.is_public ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete translation"
                            className="h-8 w-8 shrink-0 text-slate-300 dark:text-slate-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all rounded-lg"
                            onClick={e => handleDelete(e, item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function History({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
}
