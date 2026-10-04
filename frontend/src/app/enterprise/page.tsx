import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Fingerprint, Code2, KeyRound } from "lucide-react";
import { Logo } from "@/components/landing/Logo";

export const metadata: Metadata = {
  title: "Enterprise information",
  description: "Current Anuvaad product details for teams evaluating code translation and review workflows.",
};

const CURRENT_DETAILS = [
  {
    icon: Fingerprint,
    title: "Audit metadata",
    body: "Supported translation routes return an HMAC-SHA256 digest derived from request metadata and an input hash. A digest does not certify system-wide retention behavior.",
  },
  {
    icon: Code2,
    title: "Browser sandbox",
    body: "The translation workspace provides a client-side sandbox for supported code. Check the sandbox controls and language support before running a snippet.",
  },
  {
    icon: KeyRound,
    title: "Sign-in options",
    body: "Accounts can sign in with email, GitHub, or Google. Enterprise SSO and SCIM are not presented as available product features.",
  },
];

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-[#f7f4ec] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Anuvaad home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
            <Logo showText iconSize={24} textSize="text-base" theme="auto" />
          </Link>
          <Link href="/privacy" className="text-sm font-medium text-slate-600 underline decoration-amber-500 underline-offset-4 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Privacy details</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-3xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-amber-800 dark:text-amber-400">For teams evaluating Anuvaad</p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Know what’s available before you share code.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            This page describes current product behavior. For sensitive code or formal procurement, review the privacy and terms pages and confirm that the available controls meet your requirements.
          </p>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-3" aria-label="Current product details">
          {CURRENT_DETAILS.map(({ icon: Icon, title, body }, index) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-8 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-400/10 dark:text-amber-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="font-mono text-xs text-slate-500">0{index + 1}</span>
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
            </article>
          ))}
        </section>

        <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">Need a control that isn’t listed?</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Ask about current availability. We’ll clarify what the product can support today.</p>
          </div>
          <a href="mailto:enterprise@anuvaad.dev" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:bg-white dark:text-slate-950 dark:hover:bg-amber-300">
            Contact the team <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-3 px-4 py-6 text-sm text-slate-600 dark:text-slate-400 sm:px-6">
          <Link href="/" className="hover:text-slate-950 dark:hover:text-white">Workbench</Link>
          <Link href="/privacy" className="hover:text-slate-950 dark:hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-950 dark:hover:text-white">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
