import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomerProofProps {
  className?: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
  rating: number;
  highlight: string;
}

export const TESTIMONIALS_DATA: TestimonialItem[] = [
  {
    id: "alex",
    name: "Alex Chen",
    role: "Platform Lead",
    company: "Stripe",
    avatar: "AC",
    quote:
      "We use Anuvaad to port legacy Python prototypes to idiomatic Go. The line-by-line mapping and concurrency handling cut our refactor time by 70%.",
    rating: 5,
    highlight: "Cut refactor time by 70%",
  },
  {
    id: "sophie",
    name: "Sophie Laurent",
    role: "Principal Engineer",
    company: "Datadog",
    avatar: "SL",
    quote:
      "The simulated PR review summary explains architectural impact and breaking changes better than standard LLM prompts. It is an indispensable part of our review cycle.",
    rating: 5,
    highlight: "Explains architectural risk",
  },
  {
    id: "james",
    name: "James O.",
    role: "Tech Lead",
    company: "Linear",
    avatar: "JO",
    quote:
      "Onboarded 4 new engineers to our complex TypeScript monorepo in two days. Anuvaad's English explanations make obscure architectural patterns crystal clear.",
    rating: 5,
    highlight: "2-day monorepo onboarding",
  },
  {
    id: "priya",
    name: "Priya Sharma",
    role: "Senior Backend Engineer",
    company: "Flipkart",
    avatar: "PS",
    quote:
      "Zero Code Storage was mandatory for our security compliance. Anuvaad delivered speed, precision, and complete peace of mind.",
    rating: 5,
    highlight: "Zero code storage compliance",
  },
  {
    id: "david",
    name: "David Kim",
    role: "Data Engineering Lead",
    company: "Notion",
    avatar: "DK",
    quote:
      "Converting complex recursive SQL CTEs to plain English allowed our product and analytics teams to finally collaborate seamlessly.",
    rating: 5,
    highlight: "Seamless cross-functional alignment",
  },
  {
    id: "maria",
    name: "Maria Garcia",
    role: "Engineering Manager",
    company: "Shopify",
    avatar: "MG",
    quote:
      "The benchmark speed across 35+ languages is real. Sub-3s responses keep our team in uninterrupted flow state.",
    rating: 5,
    highlight: "Uninterrupted dev flow state",
  },
];

export const COMPANY_LOGOS = [
  "Stripe",
  "Vercel",
  "Supabase",
  "Linear",
  "Flipkart",
  "Datadog",
  "Shopify",
  "Notion",
];

export function CustomerProof({ className }: CustomerProofProps) {
  return (
    <section
      id="proof"
      className={cn(
        "py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 w-full",
        className
      )}
      aria-labelledby="proof-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
            <span>Verified Engineering Feedback</span>
          </div>
          <h2
            id="proof-heading"
            className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4"
          >
            Loved by Developers.{" "}
            <span className="text-amber-500">Proven at Scale.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            From high-growth scaleups to Fortune 500 engineering orgs — developers
            rely on Anuvaad to master complex code.
          </p>
        </div>

        {/* Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { val: "50,000+", label: "PRs Reviewed" },
            { val: "99.4%", label: "Syntactic Accuracy" },
            { val: "35+", label: "Languages Supported" },
            { val: "<2.8s", label: "Median Latency" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-xs"
            >
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-1">
                {m.val}
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* Company Badges Wall */}
        <div
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-16 opacity-70"
          aria-label="Companies using Anuvaad"
        >
          {COMPANY_LOGOS.map((company) => (
            <span
              key={company}
              className="text-sm sm:text-base font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-3 py-1"
            >
              {company}
            </span>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS_DATA.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-all"
            >
              <div>
                <div className="flex items-center gap-1 mb-4" aria-label={`${t.rating} out of 5 stars`}>
                  {[...Array(t.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-500 text-amber-500"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <blockquote className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.role} ·{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {t.company}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CustomerProof;
