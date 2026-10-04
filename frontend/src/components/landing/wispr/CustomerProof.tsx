import React from "react";
import { ArrowDownRight, Braces, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomerProofProps {
  className?: string;
}

const languageNames = [
  "Python", "TypeScript", "JavaScript", "Go", "Rust", "Java", "SQL", "C++",
];

/** A product capabilities section; customer quotes and adoption figures belong here only when verified. */
export function CustomerProof({ className }: CustomerProofProps) {
  return (
    <section
      id="proof"
      className={cn("w-full border-y border-slate-200 bg-[#f7f4ec] py-20 text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 sm:py-28", className)}
      aria-labelledby="proof-heading"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="max-w-xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Built around real code</p>
          <h2 id="proof-heading" className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            A clearer way into unfamiliar code.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300">
            Start with a snippet, choose the kind of help you need, and keep the result beside the original. Anuvaad is designed to make the next step easier to judge.
          </p>
          <a href="#playground" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-4 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-white dark:hover:text-amber-300">
            Try the example <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
              <Braces className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">01 / Understand</p>
            <h3 className="mt-2 text-lg font-semibold">Make the logic legible</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Ask for a plain-language explanation, then compare it with the code that produced it.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950 sm:mt-10">
            <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-800 dark:bg-orange-400/10 dark:text-orange-300">
              <Languages className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">02 / Translate</p>
            <h3 className="mt-2 text-lg font-semibold">Keep both sides in view</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Move between supported languages while keeping the source and generated result close together.</p>
          </article>
          <div className="sm:col-span-2 rounded-2xl border border-slate-200/80 bg-white/60 px-5 py-4 dark:border-slate-700 dark:bg-slate-950/50">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">A selection of supported languages</p>
            <ul className="flex flex-wrap gap-2" aria-label="Supported programming languages">
              {languageNames.map((language) => <li key={language} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{language}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CustomerProof;
