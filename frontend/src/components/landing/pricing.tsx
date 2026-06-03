"use client";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
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
    ],
    cta: "Start Free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: { monthly: 499, yearly: 3999 },
    description: "For power users who need unlimited access.",
    features: [
      "Unlimited translations",
      "Priority processing",
      "Large inputs (50K chars)",
      "Cloud-synced history",
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
    description: "For teams that need shared access.",
    features: [
      "Everything in Pro",
      "5 team members",
      "Shared workspace",
      "Admin billing",
      "Priority support",
      "Custom onboarding",
    ],
    cta: "Contact Sales",
    href: "/signup?plan=team",
    highlighted: false,
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <section className="relative border-t border-white/5 py-32 overflow-hidden bg-transparent">
      {/* Light glow behind pricing */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="cinematic-reveal mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-400"
          >
            Pricing
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Start free. Upgrade when you need more power and collaboration.
          </p>

          {/* Pricing Toggle */}
          <div className="mt-10 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#060613]/80 p-1.5 backdrop-blur-md">
            <button
              onClick={() => setYearly(false)}
              className={cn(
                "rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300",
                !yearly
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={cn(
                "rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300",
                yearly
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Yearly <span className="ml-1.5 text-[10px] text-pink-400 lowercase font-medium">Save ~33%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "cinematic-reveal relative rounded-2xl border p-8 flex flex-col justify-between transition-all duration-500 bg-[#060613]/70 backdrop-blur-md hover:scale-[1.03]",
                plan.highlighted
                  ? "border-indigo-500/40 shadow-[0_0_35px_rgba(99,102,241,0.15)] bg-gradient-to-b from-[#0a0724]/90 to-[#050314]/90"
                  : "border-white/5 shadow-2xl shadow-black/40 hover:border-indigo-500/20 hover:shadow-[0_0_25px_rgba(99,102,241,0.05)]"
              )}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 border-none font-bold uppercase tracking-wider text-[9px] px-3 py-1 shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  {plan.badge}
                </Badge>
              )}
              
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
                
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white">
                    ₹{yearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && <span className="text-sm text-slate-400">/month</span>}
                </div>
                {yearly && plan.price.yearly > 0 && (
                  <p className="mt-2 text-xs text-indigo-400 font-semibold tracking-wider uppercase">
                    Billed ₹{plan.price.yearly}/year
                  </p>
                )}

                <Link
                  href={plan.href}
                  className={cn(
                    buttonVariants({ variant: plan.highlighted ? "default" : "outline" }),
                    "mt-8 w-full text-center font-bold uppercase tracking-wider text-xs py-5 transition-all duration-300",
                    plan.highlighted
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]"
                      : "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  )}
                >
                  {plan.cta}
                </Link>
              </div>

              <ul className="mt-10 space-y-4 border-t border-white/5 pt-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3.5 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-indigo-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
