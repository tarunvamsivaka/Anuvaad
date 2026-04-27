"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Code2, FileText, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const modeIcons = { "Code → English": FileText, "English → Code": Code2, "Code → Code": ArrowLeftRight };

export default function HistoryPage() {
  const [search, setSearch] = useState("");

  // TODO: Replace with real API call to fetch translation history
  const history: { id: number; title: string; lang: string; mode: string; date: string; chars: number }[] = [];

  const filtered = history.filter((h) =>
    h.title.toLowerCase().includes(search.toLowerCase()) ||
    h.lang.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <h1 className="text-lg font-semibold">Translation History</h1>
          <span className="text-xs text-muted-foreground">{history.length} translations</span>
        </div>
      </header>
      <div className="p-6">
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search translations..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm" />
        </div>
        <div className="space-y-2">
          {filtered.map((item) => {
            const Icon = modeIcons[item.mode as keyof typeof modeIcons] || FileText;
            return (
              <Card key={item.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 cursor-pointer">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.mode} · {item.chars} chars</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{item.lang}</Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.date}</span>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Code2 className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="mt-6 text-sm font-medium">No translations yet</p>
              <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                Your translation history will appear here once you start translating code.
              </p>
              <Link
                href="/dashboard/translate"
                className={cn(buttonVariants({ size: "sm" }), "mt-6 gap-1.5 bg-amber-600 hover:bg-amber-700")}
              >
                <Code2 className="h-3.5 w-3.5" /> Start Translating
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
