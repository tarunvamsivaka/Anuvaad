"use client";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free", price: { monthly: 0, yearly: 0 },
    description: "For individual developers getting started.",
    features: ["10 translations per day", "7 programming languages", "All 3 translation modes", "Export as MD, JSON, PDF", "Syntax highlighted editor"],
    cta: "Start Free", href: "/signup", highlighted: false,
  },
  {
    name: "Pro", price: { monthly: 12, yearly: 96 },
    description: "For power users who need unlimited access.",
    features: ["Unlimited translations", "Priority processing", "Large inputs (50K chars)", "Cloud-synced history", "Early access to features", "Email support"],
    cta: "Upgrade to Pro", href: "/signup?plan=pro", highlighted: true, badge: "Most Popular",
  },
  {
    name: "Team", price: { monthly: 29, yearly: 228 },
    description: "For teams that need shared access.",
    features: ["Everything in Pro", "5 team members", "Shared workspace", "Admin billing", "Priority support", "Custom onboarding"],
    cta: "Contact Sales", href: "/signup?plan=team", highlighted: false,
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" className="border-t border-border/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-4 text-lg text-muted-foreground">Start free. Upgrade when you need more.</p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-muted/50 p-1">
            <button onClick={() => setYearly(false)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${!yearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Monthly</button>
            <button onClick={() => setYearly(true)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${yearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Yearly <span className="ml-1.5 text-xs text-amber-600">Save 33%</span></button>
          </div>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-xl border p-8 ${plan.highlighted ? "border-amber-600/50 bg-card shadow-lg shadow-amber-600/5" : "border-border/60 bg-card"}`}>
              {plan.badge && <Badge className="absolute -top-3 left-6 bg-amber-600 text-white hover:bg-amber-600">{plan.badge}</Badge>}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${yearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly}</span>
                {plan.price.monthly > 0 && <span className="text-sm text-muted-foreground">/month</span>}
              </div>
              {yearly && plan.price.yearly > 0 && <p className="mt-1 text-xs text-muted-foreground">Billed ${plan.price.yearly}/year</p>}
              <Link href={plan.href} className={cn(
                buttonVariants({ variant: plan.highlighted ? "default" : "outline" }),
                "mt-6 w-full text-center",
                plan.highlighted && "bg-amber-600 hover:bg-amber-700"
              )}>{plan.cta}</Link>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (<li key={f} className="flex items-start gap-3 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{f}</li>))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
