import { Metadata } from "next";
import Link from "next/link";
import {
  Shield, Lock, Server, Users, FileCheck,
  ArrowRight, CheckCircle2, Zap, Clock
} from "lucide-react";

export const metadata: Metadata = {
  title: "Enterprise | Anuvaad",
  description:
    "Anuvaad for enterprise — ZDR architecture, GDPR-aligned design, self-hosted deployment roadmap, and dedicated support for engineering teams working in regulated industries.",
};

const ENTERPRISE_FEATURES = [
  {
    icon: Lock,
    title: "Zero Code Storage (ZDR)",
    description: "Code is processed in encrypted volatile RAM and discarded on completion. Every translation generates an HMAC-SHA256 cryptographic audit receipt. Zero code is ever written to disk or used for training.",
    badge: "Live",
    badgeColor: "emerald",
  },
  {
    icon: Shield,
    title: "SOC2 Type II — On Roadmap",
    description: "SOC2 Type II audit is on our compliance roadmap for Q2 2027. Our architecture is built from day one with SOC2 controls in mind: immutable access logs, encryption in transit (TLS 1.3) and at rest, and ZDR data handling policies.",
    badge: "Q2 2027",
    badgeColor: "amber",
  },
  {
    icon: FileCheck,
    title: "GDPR-Aligned Architecture",
    description: "Privacy by design: no persistent code storage, minimal data collection, and a clear data processing model. GDPR Data Processing Agreements (DPAs) available on request. HIPAA BAA is on our compliance roadmap.",
    badge: "Available",
    badgeColor: "emerald",
  },
  {
    icon: Server,
    title: "Self-Hosted Deployment — Roadmap",
    description: "On-premises and VPC deployment (AWS, GCP, Azure) is on our infrastructure roadmap. Contact us to join the early-access queue for self-hosted Anuvaad with custom LLM endpoints.",
    badge: "Roadmap",
    badgeColor: "slate",
  },
  {
    icon: Users,
    title: "SSO — Coming for Enterprise",
    description: "SAML 2.0 SSO with Okta, Azure AD, and Google Workspace is in development via Ory Polis (open-source). Join the enterprise waitlist to be notified when SSO becomes available.",
    badge: "In Development",
    badgeColor: "amber",
  },
  {
    icon: Zap,
    title: "Priority Infrastructure",
    description: "Priority inference queue, dedicated CSM, custom SLA, and priority support. Contact our team to discuss infrastructure options for high-volume engineering organizations.",
    badge: "Contact Us",
    badgeColor: "emerald",
  },
];

const BADGE_COLORS: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-slate-900 dark:text-white hover:text-amber-500 transition-colors">
            ← Anuvaad
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Pricing
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="py-24 sm:py-32 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-6">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Enterprise Security &amp; Compliance
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter text-slate-900 dark:text-white mb-6">
            AI Code Intelligence for{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Regulated Teams
            </span>
          </h1>
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-4 max-w-2xl mx-auto">
            Anuvaad Enterprise gives security-first engineering organizations the privacy architecture,
            isolation roadmap, and control they need to deploy AI code translation with confidence.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-10 max-w-2xl mx-auto">
            We are an early-stage startup. Certifications like SOC2 Type II and HIPAA BAA are on our roadmap.
            Current customers get our ZDR cryptographic guarantee and direct access to the founding team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:enterprise@anuvaad.dev"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all hover:scale-105 shadow-sm"
            >
              Contact Enterprise Sales
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              See Pricing
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ENTERPRISE_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 hover:border-amber-500/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${BADGE_COLORS[feature.badgeColor]}`}>
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What's included */}
        <section className="pb-24 border-t border-slate-200 dark:border-slate-800 pt-16">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              Everything in Pro, plus:
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Items marked with <Clock className="inline h-3.5 w-3.5 text-amber-500" aria-hidden="true" /> are on our roadmap. Contact us to discuss timelines.
            </p>
            <ul className="space-y-4">
              {[
                { text: "Unlimited team seats with role-based access control", live: true },
                { text: "SAML 2.0 SSO + SCIM provisioning (Okta, Azure AD, Google)", live: false },
                { text: "Self-hosted VPC deployment on AWS / GCP / Azure", live: false },
                { text: "Air-gapped on-premises Kubernetes deployment", live: false },
                { text: "SOC2 Type II audit report (roadmap Q2 2027)", live: false },
                { text: "HIPAA Business Associate Agreement (BAA) — roadmap", live: false },
                { text: "GDPR Data Processing Agreement (DPA)", live: true },
                { text: "Custom LLM endpoints and model selection", live: false },
                { text: "Dedicated Customer Success Manager", live: true },
                { text: "Priority inference queue", live: true },
                { text: "Custom contract and invoicing", live: true },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  {item.live ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
                  )}
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24">
          <div className="rounded-3xl bg-slate-950 text-white p-12 sm:p-16 text-center relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.15),transparent_60%)]"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
                Building for a regulated industry?
              </h2>
              <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                Talk to our team about your compliance requirements, deployment preferences, and security architecture.
                We work directly with regulated customers to build the right solution.
              </p>
              <a
                href="mailto:enterprise@anuvaad.dev"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all hover:scale-105 shadow-lg"
              >
                Schedule a Security Review
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
