"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Code2, FileText, ArrowLeftRight, Trash2, Calendar } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const modeIcons = { "Code → English": FileText, "English → Code": Code2, "Code → Code": ArrowLeftRight };

interface HistoryItem {
  id: string;
  input_preview: string;
  source_language: string;
  target_language: string;
  mode: string;
  char_count: number;
  created_at: string;
  model_used: string;
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
  } catch (e) {
    return "Just now";
  }
}

export default function HistoryPage() {
  const { user, session } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch translations via backend API (avoids RLS recursion)
  useEffect(() => {
    async function fetchHistory() {
      if (!session?.access_token) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API}/api/history`, {
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch history");
        
        const data: HistoryItem[] = await res.json();
        setHistory(data.slice(0, 50));
      } catch (err) {
        console.error("Error fetching history:", err);
        toast.error("Failed to load translation history.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, [session?.access_token]);

  // Client-side search filter (no re-fetch)
  const filteredHistory = useMemo(() => {
    if (!debouncedSearch) return history;
    const q = debouncedSearch.toLowerCase();
    return history.filter((item) =>
      item.input_preview?.toLowerCase().includes(q) ||
      item.source_language?.toLowerCase().includes(q) ||
      item.target_language?.toLowerCase().includes(q) ||
      item.mode?.toLowerCase().includes(q)
    );
  }, [history, debouncedSearch]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Optimistically update UI, keep backup for rollback
    const previousHistory = history;
    setHistory((prev) => prev.filter((item) => item.id !== id));
    
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/history/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      console.error("Error deleting history item:", err);
      // Rollback on failure
      setHistory(previousHistory);
      toast.error("Failed to delete translation. Please try again.");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <h1 className="text-lg font-semibold">Translation History</h1>
          {!loading && (
            <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
              {filteredHistory.length} {history.length === 50 ? "most recent" : "translations"}
            </span>
          )}
        </div>
      </header>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="relative mb-8 w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            aria-label="Search translations"
            placeholder="Search your past translations..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm shadow-sm border-border bg-background" 
          />
        </div>
        
        <div aria-live="polite" className="sr-only">
          {!loading && `${filteredHistory.length} results found`}
        </div>

        <div className="space-y-3">
          {loading ? (
             <div className="space-y-3">
               {[1, 2, 3, 4, 5, 6].map(i => (
                 <Skeleton key={i} className="h-20 w-full rounded-xl" />
               ))}
             </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-background shadow-sm border border-border">
                <Code2 className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="mt-6 text-sm font-semibold">No translations found</p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {search ? "We couldn't find any translations matching your search." : "Your translation history will appear here once you start translating code."}
              </p>
              {!search && (
                <Link
                  href="/dashboard/translate"
                  className={cn(buttonVariants({ size: "sm" }), "mt-6 gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-sm")}
                >
                  <Code2 className="h-4 w-4" /> Start Translating
                </Link>
              )}
            </div>
          ) : (
            filteredHistory.map((item) => {
              const Icon = modeIcons[item.mode as keyof typeof modeIcons] || FileText;
              const relativeDate = getRelativeTimeString(item.created_at);
              const langLabel = item.mode === "Code → Code" ? `${item.source_language} to ${item.target_language}` : (item.source_language || item.target_language);

              return (
                <Card key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 transition-all hover:bg-muted/30 border-border/60 shadow-sm hover:shadow-md relative group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-500/20">
                      <Icon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.input_preview || "Code Snippet"}...</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] font-medium bg-muted text-muted-foreground border-transparent">
                          {item.mode}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{langLabel}</span>
                        {item.model_used && (
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded sm:inline-block">
                            {item.model_used}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0 mt-3 sm:mt-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Code2 className="h-3 w-3" />
                      {item.char_count?.toLocaleString() || 0} chars
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-28 sm:justify-end">
                      <Calendar className="h-3 w-3" />
                      {relativeDate}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      aria-label={`Delete translation: ${item.input_preview || "Code Snippet"}`}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4 sm:static"
                      onClick={(e) => handleDelete(e, item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
