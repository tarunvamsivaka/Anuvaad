"use client";

import { Check, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    description: "For individual developers getting started.",
    features: [
      "10 translations per day",
      "35+ programming languages",
      "All 3 translation modes",
      "Export as MD, JSON, PDF",
      "Syntax highlighted editor",
      "Translation history",
    ],
    cta: "Start Free",
    href: "/signup",
    highlighted: false,
    badge: null,
  },
  {
    name: "Pro",
    price: { monthly: 499, yearly: 3999 },
    description: "For power users who need unlimited access and larger inputs.",
    features: [
      "Unlimited translations",
      "Priority AI processing",
      "Large inputs (50K chars)",
      "Cloud-synced history",
      "Team workspace (5 members)",
      "Early access to features",
      "Email support",
    ],
    cta: "Upgrade to Pro",
    href: "/signup?plan=pro",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Team",
    price: { monthly: 1200, yearly: 9999 },
    description: "For engineering teams that need shared access and admin controls.",
    features: [
      "Everything in Pro",
      "Up to 20 team members",
      "Shared workspace history",
      "Admin billing & controls",
      "Priority support",
      "Custom onboarding",
    ],
    cta: "Contact Sales",
    href: "/signup?plan=team",
    highlighted: false,
    badge: null,
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="landing-section relative border-t border-amber-500/8 py-32 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
        style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 60%)" }}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
            <Zap className="h-3 w-3" />
            Pricing
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Start free. Upgrade when you need more power. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-10 inline-flex items-center gap-1.5 rounded-full border border-amber-500/15 bg-[#0c0c0f]/90 p-1.5 backdrop-blur-md">
            <button
              onClick={() => setYearly(false)}
              className={cn(
                "rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300",
                !yearly
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={cn(
                "rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2",
                yearly
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Yearly
              <span className={cn(
                "text-[10px] font-bold lowercase px-1.5 py-0.5 rounded-full transition-colors",
                yearly ? "bg-slate-950/20 text-slate-950" : "bg-emerald-500/15 text-emerald-400"
              )}>
                Save 33%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-6 lg:grid-cols-3 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-2xl border p-8 flex flex-col transition-all duration-400 overflow-hidden group",
                plan.highlighted
                  ? "border-amber-500/30 bg-gradient-to-b from-amber-500/8 via-[#0c0c0f] to-[#0c0c0f] shadow-[0_0_60px_rgba(245,158,11,0.12)] scale-[1.02]"
                  : "border-white/5 bg-[#0c0c0f]/80 shadow-2xl shadow-black/40 backdrop-blur-sm hover:border-amber-500/15 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)]"
              )}
            >
              {/* Shimmer on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.4)]">
                    <Sparkles className="h-2.5 w-2.5" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="relative z-10">
                <h3 className="text-xl font-bold tracking-tight text-white">{plan.name}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{plan.description}</p>

                <div className="mt-8 flex items-baseline gap-1.5">
                  <span className="text-5xl font-black text-white">
                    ₹{yearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span className="text-sm text-slate-500">/month</span>
                  )}
                </div>
                {yearly && plan.price.yearly > 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-amber-400/80">
                    Billed ₹{plan.price.yearly} annually
                  </p>
                )}

                <Link
                  href={plan.href}
                  className={cn(
                    "mt-8 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300",
                    plan.highlighted
                      ? "btn-amber-shimmer shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.02]"
                      : "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-500/20 text-white"
                  )}
                >
                  {plan.highlighted && <Sparkles className="h-3.5 w-3.5" />}
                  {plan.cta}
                </Link>
              </div>

              <ul className="relative z-10 mt-8 space-y-3.5 border-t border-white/5 pt-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/20">
                      <Check className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="mt-10 text-center text-xs text-slate-600">
          All plans include a 14-day money-back guarantee. · Prices in INR · Taxes may apply.
        </p>
      </div>
    </section>
  );
}
