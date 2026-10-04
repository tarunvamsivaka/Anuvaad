"use client";

import React from "react";
import { ArrowRight, Code2, Fingerprint, KeyRound, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EnterpriseSecurityProps {
  className?: string;
}

export interface SecurityPillar {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge: string;
  description: string;
}

export const ENTERPRISE_SECURITY_PILLARS: SecurityPillar[] = [
  {
    icon: Fingerprint,
    title: "Translation audit receipts",
    badge: "HMAC-SHA256",
    description: "Translation endpoints return an HMAC-SHA256 audit digest. The receipt contains an input hash rather than the source text. Read the privacy documentation for processing details.",
  },
  {
    icon: Code2,
    title: "Run code in the browser",
    badge: "Client sandbox",
    description: "The translation workspace includes a client-side sandbox for supported code. Its execution flow is separate from server translation; check the sandbox status before running a snippet.",
  },
  {
    icon: KeyRound,
    title: "Sign in with GitHub",
    badge: "Current authentication",
    description: "The current account flow offers email, GitHub, and Google sign-in. Enterprise SSO and independent compliance certifications are not represented as available features.",
  },
];

export function EnterpriseSecurity({ className }: EnterpriseSecurityProps) {
  return (
    <section
      id="security"
      className={cn("relative w-full overflow-hidden border-y border-slate-800 bg-slate-950 py-20 text-slate-100 sm:py-28", className)}
      aria-labelledby="security-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]" aria-hidden="true" style={{ backgroundImage: "radial-gradient(#f8fafc 0.7px, transparent 0.7px)", backgroundSize: "18px 18px" }} />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            How Anuvaad handles your work
          </div>
          <h2 id="security-heading" className="font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Security details, <span className="text-amber-400">without the guesswork.</span>
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-400 sm:text-lg">
            Here is what the product currently supports. For requirements not covered here, review the security and privacy documentation before using Anuvaad with sensitive code.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {ENTERPRISE_SECURITY_PILLARS.map(({ icon: Icon, title, badge, description }, index) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition-colors hover:border-amber-400/40 sm:p-7">
              <div className="mb-8 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-amber-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">0{index + 1} / {badge}</span>
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h3 className="font-semibold text-white">Need a security detail?</h3>
            <p className="mt-1 text-sm text-slate-400">Review the current processing model and available controls in the privacy and security documentation.</p>
          </div>
          <a href="/privacy" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
            Read the privacy page <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

export default EnterpriseSecurity;
