import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog | Anuvaad",
  description: "What's new in Anuvaad — release notes, new features, fixes, and improvements.",
};

const CHANGELOG = [
  {
    version: "2.1.0",
    date: "September 2026",
    badge: "🚀 Major Release",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    items: [
      { type: "🆕 New", text: "DeepSeek R1 reasoning model integration for complex architectural analysis" },
      { type: "🆕 New", text: "AI-powered PR review: architectural impact, risk badges, and breaking change detection" },
      { type: "🆕 New", text: "Live Interactive Playground with 35+ language presets and typewriter streaming" },
      { type: "🆕 New", text: "Benchmark Explorer: latency and accuracy matrix for Groq, DeepSeek, Claude, GPT-4o" },
      { type: "⚡ Perf", text: "Median inference latency reduced to <1.9s (P50) via Groq LPU acceleration" },
      { type: "⚡ Perf", text: "Upstash Redis caching cuts repeated translation latency to <200ms" },
    ],
  },
  {
    version: "2.0.0",
    date: "August 2026",
    badge: "✨ Redesign",
    badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    items: [
      { type: "🆕 New", text: "Complete frontend redesign — product-first Wispr Flow-inspired neutral aesthetic" },
      { type: "🆕 New", text: "Floating pill navigation with active section tracking" },
      { type: "🆕 New", text: "Enterprise Security section: ZDR cryptographic receipts, GDPR-aligned architecture" },
      { type: "⚡ Perf", text: "Performance-optimized WebGL particle canvas with automatic off-screen pause" },
      { type: "🐛 Fix", text: "WCAG 2.1 AA accessibility: full keyboard navigation, ARIA landmarks, skip links" },
    ],
  },
  {
    version: "1.5.0",
    date: "June 2026",
    badge: "📈 Growth",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    items: [
      { type: "🆕 New", text: "Team Workspaces — collaborative translation context with role-based access" },
      { type: "🆕 New", text: "API Keys — programmatic access via ak_ bearer tokens" },
      { type: "🆕 New", text: "RAG Repository Indexing — pgvector semantic code search" },
      { type: "🆕 New", text: "GitHub Gist import — paste public Gist URL to load code directly" },
      { type: "⚡ Perf", text: "4 Uvicorn workers for I/O-bound concurrency; Python 3.11/3.12/3.13 support" },
      { type: "🐛 Fix", text: "Rate limiting now uses real client IPs via TRUST_PROXY_HOPS on Render" },
    ],
  },
  {
    version: "1.0.0",
    date: "March 2026",
    badge: "🎉 Launch",
    badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    items: [
      { type: "🆕 New", text: "Initial launch: Code → English, English → Code, Code → Code translation modes" },
      { type: "🆕 New", text: "Groq (Llama 3.3 70B) + DeepSeek V3 with intelligent failover" },
      { type: "🆕 New", text: "Real-time SSE streaming translation output" },
      { type: "🆕 New", text: "Supabase Auth (Google + GitHub OAuth)" },
      { type: "🆕 New", text: "Razorpay billing with Pro plan and translation credits" },
      { type: "🆕 New", text: "Zero code storage architecture — privacy by default" },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-900 dark:text-white hover:text-amber-500 transition-colors"
          >
            ← Anuvaad
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-2xl mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Changelog</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white mb-4">
            What&apos;s new in Anuvaad
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            New features, performance improvements, and bug fixes. Updated with every release.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 ml-[7px]" aria-hidden="true" />

          <div className="space-y-16">
            {CHANGELOG.map((release) => (
              <div key={release.version} className="relative pl-10">
                {/* Timeline dot */}
                <div
                  className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full bg-amber-500 ring-4 ring-white dark:ring-slate-950 shadow"
                  aria-hidden="true"
                />

                {/* Release header */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${release.badgeColor}`}>
                    {release.badge}
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">v{release.version}</span>
                  <span className="text-sm text-slate-500">{release.date}</span>
                </div>

                {/* Items */}
                <ul className="space-y-2.5">
                  {release.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="shrink-0 font-mono text-[11px] mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {item.type}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Subscribe */}
        <div className="mt-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Get release notifications</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Follow{" "}
            <a
              href="https://x.com/anuvaad_dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 hover:text-amber-400 font-medium"
            >
              @anuvaad_dev on X
            </a>{" "}
            or{" "}
            <a
              href="https://github.com/tarunvamsivaka/Anuvaad"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 hover:text-amber-400 font-medium"
            >
              star the repo on GitHub
            </a>{" "}
            to get notified on every release.
          </p>
        </div>
      </main>
    </div>
  );
}
