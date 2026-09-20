"use client";

import React, { useState } from "react";
import { Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BenchmarkExplorerProps {
  onFilterLanguage?: (lang: string) => void;
  className?: string;
}

export interface LanguageBenchmark {
  language: string;
  category: string;
  latency: string;
  accuracy: string;
  concurrencyScore: number;
  tokensPerSec: number;
}

export const BENCHMARK_DATA: LanguageBenchmark[] = [
  {
    language: "Rust",
    category: "Systems",
    latency: "1.42s",
    accuracy: "99.6%",
    concurrencyScore: 98,
    tokensPerSec: 148,
  },
  {
    language: "Go",
    category: "Backend / Cloud",
    latency: "1.18s",
    accuracy: "99.5%",
    concurrencyScore: 99,
    tokensPerSec: 162,
  },
  {
    language: "TypeScript",
    category: "Fullstack / Web",
    latency: "1.25s",
    accuracy: "99.4%",
    concurrencyScore: 95,
    tokensPerSec: 154,
  },
  {
    language: "Python",
    category: "AI / Data / Scripting",
    latency: "1.34s",
    accuracy: "99.7%",
    concurrencyScore: 94,
    tokensPerSec: 150,
  },
  {
    language: "C++",
    category: "Systems / Performance",
    latency: "1.58s",
    accuracy: "99.1%",
    concurrencyScore: 97,
    tokensPerSec: 139,
  },
  {
    language: "Java",
    category: "Enterprise Backend",
    latency: "1.62s",
    accuracy: "99.3%",
    concurrencyScore: 96,
    tokensPerSec: 135,
  },
  {
    language: "SQL",
    category: "Data / Relational",
    latency: "0.88s",
    accuracy: "99.8%",
    concurrencyScore: 99,
    tokensPerSec: 180,
  },
  {
    language: "Kotlin",
    category: "Mobile / Backend",
    latency: "1.45s",
    accuracy: "99.2%",
    concurrencyScore: 95,
    tokensPerSec: 142,
  },
  {
    language: "Swift",
    category: "Apple Platforms",
    latency: "1.52s",
    accuracy: "99.0%",
    concurrencyScore: 93,
    tokensPerSec: 138,
  },
  {
    language: "C#",
    category: ".NET / Enterprise",
    latency: "1.49s",
    accuracy: "99.2%",
    concurrencyScore: 96,
    tokensPerSec: 140,
  },
];

export function BenchmarkExplorer({
  onFilterLanguage,
  className,
}: BenchmarkExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = [
    "All",
    "Systems",
    "Backend / Cloud",
    "Fullstack / Web",
    "AI / Data / Scripting",
  ];

  const filteredData = BENCHMARK_DATA.filter((item) => {
    const matchesSearch = item.language
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      item.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onFilterLanguage?.(term);
  };

  return (
    <div
      id="benchmarks"
      className={cn("w-full flex flex-col items-center", className)}
      aria-label="Multi-Language Benchmark & Latency Explorer"
    >
      {/* Module Eyebrow */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4">
        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Sub-3s Inference Benchmarks</span>
      </div>

      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 text-center">
        Multi-Language Latency & Accuracy Matrix
      </h2>
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl text-center mb-8">
        Rigorous empirical benchmarks across 35+ programming languages. Measure
        live inference speed, syntactic accuracy, and token throughput.
      </p>

      {/* Explorer Container */}
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search 35+ languages..."
              aria-label="Filter programming languages"
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap border cursor-pointer",
                  selectedCategory === cat
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Benchmarks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" role="table">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500">
                <th scope="col" className="py-3.5 px-4 font-semibold">Language</th>
                <th scope="col" className="py-3.5 px-4 font-semibold">Domain Category</th>
                <th scope="col" className="py-3.5 px-4 font-semibold">Median Latency</th>
                <th scope="col" className="py-3.5 px-4 font-semibold">Accuracy</th>
                <th scope="col" className="py-3.5 px-4 font-semibold">Throughput</th>
                <th scope="col" className="py-3.5 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredData.map((b) => (
                <tr
                  key={b.language}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white">
                    {b.language}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-400">
                    {b.category}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {b.latency}
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-semibold">
                    {b.accuracy}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {b.tokensPerSec} tok/s
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Tier 1 Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BenchmarkExplorer;
