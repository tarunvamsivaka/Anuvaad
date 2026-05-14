"use client";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

const MotionDiv = dynamic(() => import("framer-motion").then((mod) => mod.motion.div), {
  ssr: false,
});
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Hero() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/[0.07] to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
        <MotionDiv
          className="mx-auto max-w-3xl text-center"
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}
        >
          {/* Announcement badge */}
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 px-3 py-1.5 text-xs font-medium"
          >
            <Sparkles className="h-3 w-3 text-amber-600" />
            Powered by Gemini 2.5 Flash
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            Understand Any{" "}
            <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
              Codebase
            </span>{" "}
            Instantly
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            AI-powered code explanations, reverse engineering, and code
            translation for developers, students, and teams.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "gap-2 text-base")}>
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-base")}>
              See How It Works
            </a>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-muted-foreground">
            Free to start · No credit card required · 10 translations/day
          </p>
        </MotionDiv>

        {/* Product screenshot mockup */}
        <MotionDiv
          className="relative mx-auto mt-16 max-w-4xl"
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.7, delay: 0.2 }}
        >
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/5">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-background/60 px-3 py-1 text-center text-xs text-muted-foreground">
                anuvaad.dev
              </div>
            </div>

            {/* Code + Translation split view mockup */}
            <div className="grid min-h-[320px] grid-cols-1 md:grid-cols-2">
              {/* Left: Code panel */}
              <div className="border-b border-border/60 bg-[#0d0d0d] p-5 md:border-b-0 md:border-r">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
                  Source Code
                </p>
                <pre className="font-mono text-sm leading-relaxed">
                  <code>
                    <span className="text-blue-400">def</span>{" "}
                    <span className="text-amber-300">fibonacci</span>
                    <span className="text-neutral-400">(</span>
                    <span className="text-orange-300">n</span>
                    <span className="text-neutral-400">):</span>
                    {"\n"}
                    <span className="text-neutral-500">{"    "}# Base cases</span>
                    {"\n"}
                    {"    "}
                    <span className="text-purple-400">if</span>{" "}
                    <span className="text-neutral-300">n &lt;= </span>
                    <span className="text-green-400">1</span>
                    <span className="text-neutral-400">:</span>
                    {"\n"}
                    {"        "}
                    <span className="text-purple-400">return</span>{" "}
                    <span className="text-neutral-300">n</span>
                    {"\n"}
                    {"    "}
                    <span className="text-purple-400">return</span>{" "}
                    <span className="text-amber-300">fibonacci</span>
                    <span className="text-neutral-400">(</span>
                    <span className="text-neutral-300">n-1</span>
                    <span className="text-neutral-400">)</span>{" "}
                    <span className="text-neutral-300">+</span>{" "}
                    <span className="text-amber-300">fibonacci</span>
                    <span className="text-neutral-400">(</span>
                    <span className="text-neutral-300">n-2</span>
                    <span className="text-neutral-400">)</span>
                  </code>
                </pre>
              </div>

              {/* Right: Translation panel */}
              <div className="bg-card p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  English Translation
                </p>
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="mb-1 font-mono text-[10px] font-bold uppercase text-amber-600">
                      Block 1
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Defines a function called{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-medium text-foreground">
                        fibonacci
                      </code>{" "}
                      that takes one parameter{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-medium text-foreground">
                        n
                      </code>
                      . If n is 0 or 1, it returns n directly.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="mb-1 font-mono text-[10px] font-bold uppercase text-amber-600">
                      Block 2
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Otherwise, it recursively calls itself with{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-medium text-foreground">
                        n-1
                      </code>{" "}
                      and{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-medium text-foreground">
                        n-2
                      </code>
                      , adding the results together.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}
