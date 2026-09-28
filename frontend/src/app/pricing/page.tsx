import { Metadata } from "next";
import Link from "next/link";
import { Check, X, Zap, Shield, ArrowRight, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing | Anuvaad",
  description:
    "Simple, transparent pricing for every engineering team. Start free, upgrade when you need more.",
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "₹",
    description: "Perfect for individual developers exploring AI code translation.",
    cta: { label: "Get Started Free", href: "/signup", primary: false },
    features: [
      { text: "10 translations per day", included: true },
      { text: "35+ programming languages", included: true },
      { text: "Code ↔ English translation", included: true },
      { text: "Sharing via permalink", included: true },
      { text: "Basic PR review", included: false },
      { text: "GitHub Gist import", included: false },
      { text: "File upload (.py, .js, .ts)", included: false },
      { text: "Translation history", included: false },
      { text: "API access", included: false },
      { text: "Team workspaces", included: false },
      { text: "Priority inference (<1.5s)", included: false },
      { text: "DeepSeek R1 reasoning", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 499,
    annualPrice: 399,
    currency: "₹",
    badge: "Most Popular",
    description: "For professionals who need unlimited power and full platform access.",
    cta: { label: "Start Pro Free Trial", href: "/signup?plan=pro", primary: true },
    features: [
      { text: "Unlimited translations", included: true },
      { text: "35+ programming languages", included: true },
      { text: "Code ↔ English translation", included: true },
      { text: "Sharing via permalink", included: true },
      { text: "Full AI PR review", included: true },
      { text: "GitHub Gist import", included: true },
      { text: "File upload up to 200KB", included: true },
      { text: "Full translation history", included: true },
      { text: "API access (ak_ bearer tokens)", included: true },
      { text: "Team workspaces (up to 5)", included: true },
      { text: "Priority inference (<1.5s)", included: true },
      { text: "DeepSeek R1 reasoning", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    currency: "₹",
    description: "Custom security, compliance, and deployment for regulated engineering orgs.",
    cta: { label: "Contact Sales", href: "/enterprise", primary: false },
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Unlimited team seats", included: true },
      { text: "SAML 2.0 SSO + SCIM (roadmap)", included: false },
      { text: "Single-tenant VPC deploy (roadmap)", included: false },
      { text: "Air-gapped on-premises (roadmap)", included: false },
      { text: "SOC2 Type II audit report (roadmap Q2 2027)", included: false },
      { text: "HIPAA BAA (roadmap)", included: false },
      { text: "GDPR DPA", included: true },
      { text: "Custom LLM endpoints (roadmap)", included: false },
      { text: "Dedicated CSM", included: true },
      { text: "Priority SLA", included: true },
      { text: "Custom contract & billing", included: true },
    ],
  },
];

const FAQ = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrade or downgrade at any time from your dashboard billing page. Changes take effect immediately and are prorated.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "We offer a 7-day free trial for Pro with no credit card required. After the trial, choose to subscribe or stay on the Free plan.",
  },
  {
    q: "Does Anuvaad store my code?",
    a: "Never. Code snippets are streamed through encrypted volatile RAM during inference and discarded immediately upon response completion. Zero code is ever written to disk or retained for model training.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit cards, debit cards, UPI, and net banking via Razorpay. Enterprise invoicing is available on request.",
  },
  {
    q: "Can I get a SOC2 report or BAA for compliance?",
    a: "SOC2 Type II audit and HIPAA BAA are on our compliance roadmap (target Q2 2027). We currently provide a ZDR cryptographic audit receipt for every translation, GDPR-aligned DPAs, and our full security architecture documentation. Contact us to discuss your compliance requirements.",
  },
  {
    q: "How does the API work?",
    a: "Pro users can generate API keys (ak_ prefixed bearer tokens) from their dashboard settings. The REST API supports all three translation modes with SSE streaming.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-900 dark:text-white hover:text-amber-500 transition-colors"
          >
            ← Anuvaad
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/signin" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs hover:bg-amber-500 dark:hover:bg-amber-500 dark:hover:text-white transition-all"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4">
            <Zap className="h-3.5 w-3.5" />
            Simple, Transparent Pricing
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter text-slate-900 dark:text-white mb-4">
            Start free.{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Scale when ready.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            No hidden fees, no surprise overages. Every plan includes zero code storage and enterprise-grade encryption.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.id === "pro"
                  ? "border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-transparent shadow-xl shadow-amber-500/10"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950">
                  <Star className="h-2.5 w-2.5 fill-slate-950" />
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                  {plan.name}
                </h2>
                <div className="flex items-end gap-1 mb-2">
                  {plan.monthlyPrice !== null ? (
                    <>
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                        {plan.currency}{plan.monthlyPrice}
                      </span>
                      <span className="text-slate-500 text-sm mb-1">/mo</span>
                    </>
                  ) : (
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">Custom</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
              </div>

              <Link
                href={plan.cta.href}
                className={`mb-8 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                  plan.cta.primary
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm hover:scale-[1.02]"
                    : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {plan.cta.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                    ) : (
                      <X className="h-4 w-4 text-slate-300 dark:text-slate-700 shrink-0" aria-hidden="true" />
                    )}
                    <span className={feature.included ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-600"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-20 py-8 border-y border-slate-100 dark:border-slate-800">
          {[
            { icon: Shield, text: "HMAC-SHA256 Audit Receipts" },
            { icon: Shield, text: "Zero Code Storage" },
            { icon: Shield, text: "GDPR-Aligned Architecture" },
            { icon: Zap, text: "<2s Median Latency" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <Icon className="h-4 w-4 text-amber-500" aria-hidden="true" />
              {text}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-6 py-4 cursor-pointer hover:border-amber-500/30 transition-colors"
              >
                <summary className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white list-none">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Anuvaad Technologies. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</Link>
            <Link href="/enterprise" className="hover:text-slate-900 dark:hover:text-white transition-colors">Enterprise</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
