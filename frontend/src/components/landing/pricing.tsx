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
    <section id="pricing" className="wispr-section-light relative py-8 overflow-hidden">
      {/* Dark rounded pricing panel — WisprFlow signature move */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div
          className="wispr-dark-section-lg px-8 py-20"
          style={{ background: "linear-gradient(160deg, #0d1117 0%, #0f1623 60%, #0d1117 100%)" }}
        >
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,134,10,0.05) 0%, transparent 65%)" }}
          />

          <div className="mx-auto max-w-5xl relative z-10">
            {/* Header */}
            <div className="mx-auto max-w-2xl text-center mb-14">
              <div className="wispr-eyebrow-pill mb-5">
                <Zap className="h-3 w-3" />
                Pricing
              </div>
              <h2
                className="wispr-headline text-white mb-4"
                style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
              >
                Simple,{" "}
                <span style={{ color: "#c8860a", fontStyle: "italic" }}>transparent</span>{" "}
                pricing
              </h2>
              <p className="text-[17px] text-neutral-400 leading-relaxed">
                Start free. Upgrade when you need more power. Cancel anytime.
              </p>

              {/* Billing toggle */}
              <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/04 p-1.5 backdrop-blur-md">
                <button
                  onClick={() => setYearly(false)}
                  className={cn(
                    "rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300",
                    !yearly
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setYearly(true)}
                  className={cn(
                    "rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2",
                    yearly
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  Yearly
                  <span className={cn(
                    "text-[10px] font-bold lowercase px-1.5 py-0.5 rounded-full transition-colors",
                    yearly ? "bg-neutral-100/20 text-neutral-500" : "bg-emerald-500/15 text-emerald-400"
                  )}>
                    Save 33%
                  </span>
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="grid gap-5 lg:grid-cols-3 items-stretch">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "relative rounded-2xl border p-8 flex flex-col transition-all duration-400 overflow-hidden group",
                    plan.highlighted
                      ? "border-amber-500/35 bg-gradient-to-b from-amber-500/10 via-white/04 to-white/02 shadow-[0_0_60px_rgba(200,134,10,0.15),0_0_0_1px_rgba(200,134,10,0.2)] scale-[1.02]"
                      : "border-white/07 bg-white/03 hover:border-white/14 hover:bg-white/05"
                  )}
                >
                  {/* Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/02 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-950 shadow-[0_0_16px_rgba(200,134,10,0.4)]">
                        <Sparkles className="h-2.5 w-2.5" />
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="relative z-10">
                    <h3
                      className="text-xl font-semibold tracking-tight text-white"
                      style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
                    >
                      {plan.name}
                    </h3>
                    <p className="mt-1.5 text-sm text-neutral-400">{plan.description}</p>

                    <div className="mt-8 flex items-baseline gap-1.5">
                      <span className="text-5xl font-black text-white">
                        ₹{yearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly}
                      </span>
                      {plan.price.monthly > 0 && (
                        <span className="text-sm text-neutral-500">/month</span>
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
                        "mt-8 w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300",
                        plan.highlighted
                          ? "bg-amber-500 text-slate-950 shadow-[0_4px_20px_rgba(200,134,10,0.35)] hover:bg-amber-400 hover:shadow-[0_6px_30px_rgba(200,134,10,0.45)] hover:scale-[1.02]"
                          : "border border-white/10 bg-white/05 hover:bg-white/10 hover:border-white/20 text-white"
                      )}
                    >
                      {plan.highlighted && <Sparkles className="h-3.5 w-3.5" />}
                      {plan.cta}
                    </Link>
                  </div>

                  <ul className="relative z-10 mt-8 space-y-3.5 border-t border-white/06 pt-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-neutral-300">
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
            <p className="mt-10 text-center text-xs text-neutral-600">
              All plans include a 14-day money-back guarantee. · Prices in INR · Taxes may apply.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
