"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Code2, FileText, ArrowLeftRight, Loader2, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

const modeIcons = { "Code → English": FileText, "English → Code": Code2, "Code → Code": ArrowLeftRight };

interface HistoryItem {
  id: string;
  title: string;
  source_language: string;
  target_language: string;
  mode: string;
  character_count: number;
  created_at: string;
}

export default function HistoryPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      if (!session) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("translation_history")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setHistory(data as HistoryItem[] || []);
      } catch (err: any) {
        console.error("Error fetching history:", err);
        setError("Failed to load translation history.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, [session]);

  const filtered = history.filter((h) =>
    h.title.toLowerCase().includes(search.toLowerCase()) ||
    (h.source_language || "").toLowerCase().includes(search.toLowerCase()) ||
    (h.target_language || "").toLowerCase().includes(search.toLowerCase()) ||
    h.mode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <h1 className="text-lg font-semibold">Translation History</h1>
          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">{history.length} translations</span>
        </div>
      </header>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="relative mb-8 w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search your past translations..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm shadow-sm border-border bg-background" />
        </div>
        
        <div className="space-y-3">
          {loading ? (
             <div className="flex justify-center items-center py-20">
               <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
             </div>
          ) : error ? (
             <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">{error}</div>
          ) : filtered.map((item) => {
            const Icon = modeIcons[item.mode as keyof typeof modeIcons] || FileText;
            const date = new Date(item.created_at);
            const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const langLabel = item.mode === "Code → Code" ? `${item.source_language} to ${item.target_language}` : (item.source_language || item.target_language);

            return (
              <Card key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 transition-all hover:bg-muted/30 cursor-pointer border-border/60 shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-500/20">
                    <Icon className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] font-medium bg-muted text-muted-foreground border-transparent">
                        {item.mode}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{langLabel}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0 mt-3 sm:mt-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Code2 className="h-3 w-3" />
                    {item.character_count.toLocaleString()} chars
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </div>
                </div>
              </Card>
            );
          })}
          
          {!loading && !error && filtered.length === 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}
