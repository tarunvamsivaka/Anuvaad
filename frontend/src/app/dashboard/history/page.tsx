"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Code2, FileText, ArrowLeftRight, Trash2 } from "lucide-react";
import { useState } from "react";

const history = [
  { id: 1, title: "fibonacci.py", lang: "Python", mode: "Code → English", date: "Apr 26, 2026", chars: 340 },
  { id: 2, title: "quicksort.java", lang: "Java", mode: "Code → English", date: "Apr 26, 2026", chars: 520 },
  { id: 3, title: "React useState hook", lang: "JavaScript", mode: "English → Code", date: "Apr 25, 2026", chars: 180 },
  { id: 4, title: "binary_search.cpp", lang: "C++", mode: "Code → Code", date: "Apr 25, 2026", chars: 410 },
  { id: 5, title: "linked_list.py", lang: "Python", mode: "Code → English", date: "Apr 24, 2026", chars: 680 },
  { id: 6, title: "REST API with Flask", lang: "Python", mode: "English → Code", date: "Apr 24, 2026", chars: 250 },
  { id: 7, title: "merge_sort.go", lang: "Go", mode: "Code → Code", date: "Apr 23, 2026", chars: 390 },
  { id: 8, title: "async_fetch.ts", lang: "TypeScript", mode: "Code → English", date: "Apr 23, 2026", chars: 470 },
];

const modeIcons = { "Code → English": FileText, "English → Code": Code2, "Code → Code": ArrowLeftRight };

export default function HistoryPage() {
  const [search, setSearch] = useState("");
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
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium">No translations found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
