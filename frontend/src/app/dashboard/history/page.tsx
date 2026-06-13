"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Code2, FileText, ArrowLeftRight, Trash2, Calendar, Hash, Filter, Share2, Check, ExternalLink } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";
import { TopBar } from "@/components/dashboard/TopBar";

const modeIcons = {
  "Code → English": FileText,
  "English → Code": Code2,
  "Code → Code": ArrowLeftRight,
};

const modeColors: Record<string, string> = {
  "Code → English": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "English → Code": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "Code → Code": "bg-blue-500/10 text-blue-500 border-blue-500/20",
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
  session_id?: string | null;
  repository_name?: string | null;
  file_path?: string | null;
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

function groupHistory(items: HistoryItem[]): { label: string; isRepo: boolean; items: HistoryItem[] }[] {
  const groups: Record<string, { label: string, isRepo: boolean, items: HistoryItem[] }> = {};
  
  for (const item of items) {
    const isRepo = !!item.repository_name;
    const key = item.repository_name || item.session_id || "Ungrouped Translations";
    const label = item.repository_name || (item.session_id ? `Session (${item.session_id.substring(0, 8)})` : "Ungrouped Translations");
    
    if (!groups[key]) {
      groups[key] = { label, isRepo, items: [] };
    }
    groups[key].items.push(item);
  }

  return Object.values(groups).sort((a, b) => {
    if (a.label === "Ungrouped Translations") return 1;
    if (b.label === "Ungrouped Translations") return -1;
    return b.items[0].created_at.localeCompare(a.items[0].created_at);
  });
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
  }, [session?.access_token, activeWorkspace]);

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
          i.mode?.toLowerCase().includes(q) ||
          i.repository_name?.toLowerCase().includes(q) ||
          i.file_path?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [history, debouncedSearch, activeMode]);

  const grouped = useMemo(() => groupHistory(filteredHistory), [filteredHistory]);

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
  };
  
  const handleShare = async (e: React.MouseEvent, id: string, is_public?: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    if (is_public) {
      const url = `${window.location.origin}/share/${id}`;
      navigator.clipboard.writeText(url);
      toast.success("Public link copied to clipboard!");
      return;
    }
    
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
    <div className="min-h-screen dashboard-bg">
      <TopBar 
        breadcrumb={
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-text-primary">Translation History</h1>
            {!loading && (
              <Badge className="text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0">
                {filteredHistory.length}
              </Badge>
            )}
          </div>
        }
      />

      <div className="p-5 lg:p-6 max-w-4xl mx-auto space-y-6">
        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-amber-500" />
            <Input
              aria-label="Search translations"
              placeholder="Search translations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 bg-surface-card border-border-default text-sm text-text-primary placeholder:text-text-muted rounded-xl focus:border-border-active focus:ring-amber-500/20 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-surface-card border border-border-subtle rounded-xl p-1.5 shadow-sm">
            <Filter className="h-4 w-4 text-text-muted shrink-0 ml-2 mr-1" />
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {ALL_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap",
                    activeMode === mode
                      ? "bg-amber-500 text-surface-base shadow-sm"
                      : "bg-transparent text-text-muted hover:text-text-primary hover:bg-surface-mid"
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
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-xl skeleton-pulse" />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border-subtle rounded-2xl bg-surface-card/50">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-mid border border-border-subtle">
              <Code2 className="h-6 w-6 text-text-muted" />
            </div>
            <p className="text-sm font-bold text-text-primary">No translations found</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-text-muted">
              {search || activeMode !== "All"
                ? "Try a different search or filter."
                : "Your translation history will appear here."}
            </p>
            {!search && activeMode === "All" && (
              <Link
                href="/dashboard/translate"
                className={cn(buttonVariants({ size: "sm" }), "mt-5 bg-amber-500 hover:bg-amber-400 text-surface-base font-bold text-xs gap-1.5 rounded-lg")}
              >
                <Code2 className="h-3.5 w-3.5" /> Start Translating
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ label, isRepo, items }) => {
              const IconToUse = isRepo ? Code2 : Calendar;
              return (
                <div key={label}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <IconToUse className="h-3.5 w-3.5 text-text-muted" />
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">{label}</span>
                    </div>
                    <div className="flex-1 h-px bg-border-faint" />
                    <span className="text-[10px] font-medium text-text-muted">{items.length} items</span>
                  </div>

                  <div className="space-y-3">
                    {items.map(item => {
                      const Icon = modeIcons[item.mode as keyof typeof modeIcons] || FileText;
                      const modeCls = modeColors[item.mode] || "bg-surface-mid text-text-muted border-border-subtle";
                      const langLabel = item.mode === "Code → Code"
                        ? `${item.source_language} → ${item.target_language}`
                        : (item.source_language || item.target_language);

                      return (
                        <Link
                          key={item.id}
                          href={`/dashboard/translate?historyId=${item.id}`}
                          className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 dashboard-card group hover:border-amber-500/30 hover:bg-surface-mid/50 block"
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
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="truncate text-sm font-mono font-medium text-text-primary group-hover:text-amber-500 transition-colors">
                                {item.file_path ? `${item.file_path} - ` : ''}{item.input_preview || "Code Snippet"}...
                              </p>
                              
                              {/* Meta (desktop layout push right) */}
                              <div className="hidden sm:flex items-center gap-3 shrink-0 ml-4">
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
                                  <Hash className="h-3 w-3" />
                                  {item.char_count?.toLocaleString() || 0}
                                </div>
                                <div className="text-[10px] text-text-muted font-medium w-16 text-right">
                                  {getRelativeTimeString(item.created_at)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={cn("text-[9px] font-bold px-1.5 py-0.5", modeCls)}
                                >
                                  {item.mode}
                                </Badge>
                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
                                  {langLabel}
                                </span>
                                {item.model_used && (
                                  <span className="text-[9px] text-text-muted border border-border-subtle px-1.5 py-0.5 rounded-md font-mono bg-surface-mid">
                                    {item.model_used}
                                  </span>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Share translation"
                                  className={cn("h-8 w-8 shrink-0 hover:bg-blue-500/10 transition-all rounded-lg", item.is_public ? "text-blue-500 opacity-100" : "text-text-muted hover:text-blue-400 opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100")}
                                  onClick={e => handleShare(e, item.id, item.is_public)}
                                >
                                  {item.is_public ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete translation"
                                  className="h-8 w-8 shrink-0 text-text-muted hover:text-red-500 hover:bg-red-500/10 opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all rounded-lg"
                                  onClick={e => handleDelete(e, item.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                <div className="ml-1 h-8 w-8 flex items-center justify-center shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ExternalLink className="h-4 w-4 text-amber-500" />
                                </div>
                              </div>
                            </div>
                            
                            {/* Meta (mobile fallback) */}
                            <div className="flex sm:hidden items-center justify-between border-t border-border-faint pt-3 mt-3">
                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
                                <Hash className="h-3 w-3" />
                                {item.char_count?.toLocaleString() || 0} chars
                              </div>
                              <div className="text-[10px] text-text-muted font-medium">
                                {getRelativeTimeString(item.created_at)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
