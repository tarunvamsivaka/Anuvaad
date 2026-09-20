"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Zap, ArrowRight, Check, Copy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionDeckProps {
  onGetStarted?: () => void;
  onBookDemo?: () => void;
  className?: string;
}

export function ActionDeck({
  onGetStarted,
  onBookDemo,
  className,
}: ActionDeckProps) {
  const [copied, setCopied] = useState(false);
  const cliCommand = "npx anuvaad-cli init";

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(cliCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      id="cta"
      className={cn("py-16 px-4 sm:px-6 lg:px-8 w-full", className)}
      aria-label="Get Started Call to Action"
    >
      <div className="max-w-6xl mx-auto rounded-3xl bg-slate-950 text-white p-10 sm:p-16 border border-slate-800 shadow-2xl relative overflow-hidden text-center">
        {/* Radial Accent Glow */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.15),transparent_60%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-6">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ready for Instant Code Comprehension?</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">
            Transform How Your Engineering Team Reads Code.
          </h2>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-10">
            Join thousands of developers turning cryptographic legacy
            repositories into clean, readable documentation. Start in under 60
            seconds.
          </p>

          {/* Dual CTA Triggers */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {onGetStarted ? (
              <button
                onClick={onGetStarted}
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {onBookDemo ? (
              <button
                onClick={onBookDemo}
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Book Enterprise Demo</span>
              </button>
            ) : (
              <a
                href="#enterprise-contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Book Enterprise Demo</span>
              </a>
            )}
          </div>

          {/* CLI Quick Action Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 mb-8 font-mono text-xs text-slate-300">
            <span className="text-slate-500">$</span>
            <span className="select-all">{cliCommand}</span>
            <button
              onClick={handleCopy}
              type="button"
              aria-label={copied ? "Copied to clipboard" : "Copy CLI command to clipboard"}
              className="ml-2 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {copied ? (
                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            {copied && (
              <span className="text-[10px] text-emerald-400 font-sans font-medium">
                Copied!
              </span>
            )}
          </div>

          {/* Trust Checklist */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            {[
              "10 Free Translations / Day",
              "No Credit Card Required",
              "Zero Code Storage Guarantee",
              "SOC2 Type II Certified",
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ActionDeck;
