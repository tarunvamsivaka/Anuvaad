"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { BENCHMARK_DATA, LanguageBenchmark } from "./data/benchmark-data";

export { BENCHMARK_DATA };
export type { LanguageBenchmark };

export interface BenchmarkExplorerProps {
  initialCategory?: string;
  initialSort?: "latency" | "accuracy" | "name";
  onFilterLanguage?: (lang: string) => void;
  className?: string;
}

export function BenchmarkExplorer({
  initialCategory = "All",
  onFilterLanguage,
  className,
}: BenchmarkExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const categories = useMemo(() => ["All", ...Array.from(new Set(BENCHMARK_DATA.map((item) => item.category)))], []);
  const filteredData = BENCHMARK_DATA.filter((item) =>
    item.language.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === "All" || item.category === selectedCategory)
  );

  return (
    <section id="benchmarks" className={cn("w-full", className)} aria-labelledby="language-heading">
      <header className="mx-auto mb-8 max-w-2xl text-center">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Language explorer</p>
        <h2 id="language-heading" className="font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Find your language.
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Browse a selection of languages represented in Anuvaad examples. Availability and output quality depend on the task and parser support.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-[#fbfaf7] p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <label className="relative block max-w-sm">
            <span className="sr-only">Filter programming languages</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                onFilterLanguage?.(event.target.value);
              }}
              placeholder="Search languages"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filter by language category">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600",
                  selectedCategory === category
                    ? "border-slate-900 bg-slate-900 text-white dark:border-amber-300 dark:bg-amber-300 dark:text-slate-950"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {filteredData.length > 0 ? (
          <ul className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3 dark:bg-slate-800">
            {filteredData.map((item) => (
              <li key={item.language} className="flex min-h-20 items-center justify-between gap-3 bg-white px-4 py-4 dark:bg-slate-950 sm:px-5">
                <span className="font-medium text-slate-900 dark:text-white">{item.language}</span>
                <span className="text-right text-xs text-slate-500 dark:text-slate-400">{item.category}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-600 dark:text-slate-300" role="status">No languages match that search. Try a different name.</p>
        )}
      </div>
    </section>
  );
}

export default BenchmarkExplorer;
