"use client";

import React from "react";
import {
  Cpu,
  Layers,
  Zap,
  CheckCircle2,
  Fingerprint,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineNode {
  step: string;
  title: string;
  badge: string;
  description: string;
  telemetry: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: "amber" | "cyan" | "emerald";
}

const PIPELINE_NODES: PipelineNode[] = [
  {
    step: "01",
    title: "Submit a request",
    badge: "Translation API",
    description: "The workspace sends the selected code or prompt to a translation endpoint. Review the privacy page for how requests are processed.",
    telemetry: "Input + mode",
    icon: Cpu,
    accentColor: "amber",
  },
  {
    step: "02",
    title: "Parse supported syntax",
    badge: "Tree-sitter",
    description: "Tree-sitter parses supported languages to help identify syntax errors and structure in generated code.",
    telemetry: "Parser coverage varies",
    icon: Layers,
    accentColor: "cyan",
  },
  {
    step: "03",
    title: "Generate a response",
    badge: "AI provider",
    description: "Anuvaad requests a translation or explanation from its configured AI provider. Response time depends on the request and provider.",
    telemetry: "Latency varies",
    icon: Zap,
    accentColor: "amber",
  },
  {
    step: "04",
    title: "Check the result",
    badge: "Syntax validation",
    description: "Where parser support is available, the result can be checked for syntax errors before it is presented.",
    telemetry: "Not a compiler check",
    icon: CheckCircle2,
    accentColor: "emerald",
  },
  {
    step: "05",
    title: "Return audit metadata",
    badge: "HMAC-SHA256",
    description: "Supported translation endpoints return a digest derived from request metadata and an input hash. A digest does not certify system-wide retention behavior.",
    telemetry: "Receipt availability varies",
    icon: Fingerprint,
    accentColor: "cyan",
  },
  {
    step: "06",
    title: "Review before using",
    badge: "Developer judgment",
    description: "Read the generated result alongside the original and run your own tests before relying on translated code.",
    telemetry: "You stay in control",
    icon: Eye,
    accentColor: "emerald",
  },
];

export function ArchitecturalPipeline({ className }: { className?: string }) {
  return (
    <section
      id="pipeline"
      className={cn(
        "w-full pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-b border-white/5 scroll-mt-20",
        className
      )}
      aria-label="How a translation request is handled"
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            [02 // A TRANSLATION REQUEST]
          </span>
        </div>
        <h2 className="font-display text-2xl sm:text-4xl font-black tracking-tight text-white mb-3">
          From request to review
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          A simple view of the translation flow, with the limits made clear. Parser coverage and audit receipt availability depend on the route and language.
        </p>

        {/* Interactive Data-Flow Stepper Tape */}
        <div className="mt-8 w-full max-w-4xl p-2.5 rounded-xl bg-slate-950/80 border border-white/10 hidden md:flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="led-indicator led-emerald" aria-hidden="true" />
            <span className="text-slate-200 font-semibold">REQUEST FLOW:</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-amber-400">01 REQUEST</span>
            <span>──▶</span>
            <span className="text-cyan-400">02 PARSE</span>
            <span>──▶</span>
            <span className="text-amber-400">03 GENERATE</span>
            <span>──▶</span>
            <span className="text-emerald-400">04 CHECK</span>
            <span>──▶</span>
            <span className="text-cyan-400">05 RECEIPT</span>
            <span>──▶</span>
            <span className="text-emerald-400">06 REVIEW</span>
          </div>
          <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
            CHECK BEFORE USE
          </span>
        </div>
      </div>

      {/* Request flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PIPELINE_NODES.map((node) => (
          <div
            key={node.step}
            className="group rounded-2xl obsidian-deck p-6 flex flex-col justify-between border border-white/10 hover:border-amber-500/40 transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-amber-400 group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-colors">
                    <node.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    STAGE {node.step}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-white/10 group-hover:border-white/20">
                  {node.badge}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-2 group-hover:text-amber-100 transition-colors">
                {node.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors mb-4">
                {node.description}
              </p>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Note:</span>
              <span
                className={cn(
                  "font-medium",
                  node.accentColor === "emerald"
                    ? "text-emerald-400"
                    : node.accentColor === "cyan"
                    ? "text-cyan-400"
                    : "text-amber-400"
                )}
              >
                {node.telemetry}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ArchitecturalPipeline;
