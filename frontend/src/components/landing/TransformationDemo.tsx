"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Mode = "explain" | "generate" | "translate";

interface DemoExample {
  inputLabel: string;
  outputLabel: string;
  input: string;
  outputCards: { title: string; content: string }[];
  fromLang?: string;
  toLang?: string;
}

const DEMOS: Record<Mode, DemoExample> = {
  explain: {
    inputLabel: "Python Code",
    outputLabel: "Plain English Explanation",
    input: `class LRUCache:
    def __init__(self, capacity: int):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)`,
    outputCards: [
      {
        title: "Purpose",
        content: "Implements a Least Recently Used (LRU) cache — a fixed-size storage that evicts the oldest-accessed item when full.",
      },
      {
        title: "__init__ method",
        content: "Initializes the cache with an OrderedDict (which remembers insertion order) and stores the maximum allowed capacity.",
      },
      {
        title: "get method",
        content: "Retrieves a value by key. If found, moves the item to the end (marking it as most recently used) and returns its value. Returns -1 if missing.",
      },
      {
        title: "put method",
        content: "Inserts or updates a key-value pair, moving it to the end. If the cache exceeds capacity, it removes the least recently used item from the front.",
      },
    ],
  },
  generate: {
    inputLabel: "English Description",
    outputLabel: "Generated TypeScript Code",
    input: `Create a custom React hook called useLocalStorage 
that syncs a state value with localStorage. 
It should accept a key and initial value, 
handle JSON serialization/deserialization, 
and safely handle SSR environments.`,
    outputCards: [
      {
        title: "Hook Signature",
        content: "function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void]",
      },
      {
        title: "SSR Safety",
        content: "Wraps localStorage access in a try-catch block and checks typeof window !== 'undefined' to safely handle server-side rendering.",
      },
      {
        title: "State Sync",
        content: "Uses useState initialized with the stored value (or fallback), and a setter that simultaneously updates React state and persists to localStorage via JSON.stringify.",
      },
      {
        title: "Type Safety",
        content: "Generic type parameter <T> ensures the hook is fully typed — the stored value's type matches the initial value and is enforced throughout.",
      },
    ],
  },
  translate: {
    inputLabel: "Python → TypeScript",
    outputLabel: "TypeScript Output",
    fromLang: "Python",
    toLang: "TypeScript",
    input: `from dataclasses import dataclass
from typing import Optional, List

@dataclass
class User:
    id: int
    name: str
    email: str
    age: Optional[int] = None
    roles: List[str] = None

    def is_admin(self) -> bool:
        return "admin" in (self.roles or [])

    def __str__(self) -> str:
        return f"{self.name} <{self.email}>"`,
    outputCards: [
      {
        title: "Interface",
        content: "interface User { id: number; name: string; email: string; age?: number; roles?: string[]; }",
      },
      {
        title: "Class Structure",
        content: "The Python @dataclass becomes a TypeScript class with a constructor accepting a Partial<User>-style object, using Object.assign or explicit field assignment.",
      },
      {
        title: "isAdmin method",
        content: "isAdmin(): boolean { return (this.roles ?? []).includes('admin'); } — nullish coalescing replaces Python's 'or []' pattern.",
      },
      {
        title: "toString method",
        content: "toString(): string { return `${this.name} <${this.email}>`; } — Python f-strings map directly to TypeScript template literals.",
      },
    ],
  },
};

const TABS: { id: Mode; label: string; badge: string }[] = [
  { id: "explain", label: "Code → English", badge: "Explain" },
  { id: "generate", label: "English → Code", badge: "Generate" },
  { id: "translate", label: "Code → Code", badge: "Translate" },
];

export function TransformationDemo() {
  const [activeMode, setActiveMode] = useState<Mode>("explain");
  const [isScanning, setIsScanning] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Trigger animation when mode changes
  useEffect(() => {
    setShowCards(false);
    setIsScanning(false);
    const t1 = setTimeout(() => setIsScanning(true), 100);
    const t2 = setTimeout(() => { setIsScanning(false); setShowCards(true); }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeMode]);

  const demo = DEMOS[activeMode];

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="landing-section relative border-t border-amber-500/8 py-32 overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.05) 0%, transparent 70%)" }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
            Live Demo
          </div>
          <h2
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-lora, Georgia, serif)" }}
          >
            See the Transformation
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Watch code become understanding. Switch modes to explore every capability.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="mb-10 flex justify-center">
          <div className="flex rounded-xl border border-amber-500/10 bg-[#0a0a0e]/60 p-1 backdrop-blur-sm">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`demo-tab-${tab.id}`}
                onClick={() => setActiveMode(tab.id)}
                className={cn(
                  "relative rounded-lg px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300",
                  activeMode === tab.id
                    ? "bg-amber-500 text-[#020204] shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Demo Panel */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input — Code / Natural Language */}
          <div className="glass-amber rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-amber-500/10 bg-[#0a0a0e]/50 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500/40" />
                <div className="h-2 w-2 rounded-full bg-yellow-500/40" />
                <div className="h-2 w-2 rounded-full bg-green-500/40" />
              </div>
              <div className="flex items-center gap-2">
                {demo.fromLang && (
                  <>
                    <span className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">{demo.fromLang}</span>
                    <span className="text-slate-500 text-[10px]">→</span>
                    <span className="rounded border border-yellow-500/20 bg-yellow-500/5 px-2 py-0.5 font-mono text-[10px] font-bold text-yellow-400">{demo.toLang}</span>
                  </>
                )}
                {!demo.fromLang && (
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">{demo.inputLabel}</span>
                )}
              </div>
              <div />
            </div>
            {/* Input content — with scan overlay */}
            <div className="relative">
              {isScanning && (
                <div
                  className="scan-line-anim"
                  style={{ top: 0, bottom: 0, width: "3px", boxShadow: "0 0 12px 4px rgba(245,158,11,0.6)" }}
                />
              )}
              <pre className="p-6 font-mono text-xs leading-relaxed text-slate-300 overflow-x-auto whitespace-pre-wrap min-h-[300px] bg-transparent">
                <AnimatePresence mode="wait">
                  <motion.code
                    key={activeMode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {demo.input}
                  </motion.code>
                </AnimatePresence>
              </pre>
            </div>
          </div>

          {/* Output — Explanation Cards */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-1 mb-2">
              <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/60">{demo.outputLabel}</span>
              <div className="h-px flex-1 bg-gradient-to-l from-amber-500/30 to-transparent" />
            </div>

            <AnimatePresence mode="wait">
              {showCards && (
                <motion.div
                  key={activeMode}
                  className="flex flex-col gap-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.12 } },
                  }}
                >
                  {demo.outputCards.map((card, i) => (
                    <motion.div
                      key={i}
                      variants={{
                        hidden: { opacity: 0, x: 30 },
                        visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                      }}
                      className="glass-amber rounded-xl p-4 hover:border-amber-500/25 transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">{card.title}</span>
                      </div>
                      <p
                        className="text-sm leading-relaxed text-slate-300"
                        style={{ fontFamily: "var(--font-lora, Georgia, serif)", fontStyle: "italic" }}
                      >
                        {card.content}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
              {!showCards && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-amber rounded-xl p-4 animate-pulse">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400/30" />
                        <div className="h-2.5 w-20 rounded bg-amber-500/10" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-2.5 w-full rounded bg-white/5" />
                        <div className="h-2.5 w-4/5 rounded bg-white/5" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            {showCards && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-2"
              >
                <a
                  href="/signup"
                  id="demo-try-btn"
                  className="flex items-center justify-center w-full rounded-xl py-3.5 text-sm font-bold tracking-wide btn-amber-shimmer transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  Try this with your own code →
                </a>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
