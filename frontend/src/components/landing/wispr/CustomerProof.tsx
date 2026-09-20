"use client";

import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal, useCountUp } from "@/lib/use-scroll-reveal";

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
  "Stripe", "Vercel", "Supabase", "Linear", "Flipkart",
  "Datadog", "Shopify", "Notion", "GitHub", "Cloudflare",
];

// Animated count-up metric
function AnimatedMetric({
  rawValue,
  label,
  isVisible,
  delay = 0,
}: {
  rawValue: string;
  label: string;
  isVisible: boolean;
  delay?: number;
}) {
  // Extract numeric part (e.g. "50,000+" → 50000, "99.4%" → 99, "<2.8s" → 2.8)
  const numericMatch = rawValue.replace(/,/g, "").match(/[\d.]+/);
  const numericValue = numericMatch ? parseFloat(numericMatch[0]) : 0;
  const isDecimal = numericValue % 1 !== 0;
  const intTarget = isDecimal ? Math.round(numericValue * 10) : Math.round(numericValue);

  const counted = useCountUp(intTarget, isVisible, 1400 + delay);

  // Format back
  const displayValue = (() => {
    const base = isDecimal ? (counted / 10).toFixed(1) : counted;
    const formatted = Number(base) >= 1000
      ? Number(base).toLocaleString()
      : base;
    // Re-apply prefix/suffix from rawValue
    const prefix = rawValue.startsWith("<") ? "<" : "";
    const suffix = rawValue.includes("+") ? "+" : rawValue.includes("%") ? "%" : rawValue.includes("s") && !rawValue.includes("ed") ? "s" : "";
    return `${prefix}${formatted}${suffix}`;
  })();

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-xs hover:border-amber-500/30 hover:-translate-y-1 hover:shadow-md transition-all duration-300 sr-fade-up",
        isVisible && "is-visible"
      )}
      style={{ "--sr-delay": `${delay}ms` } as React.CSSProperties}
    >
      <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-1 tabular-nums">
        {isVisible ? displayValue : rawValue}
      </div>
      <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}

export function CustomerProof({ className }: CustomerProofProps) {
  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const [metricsRef, metricsVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const [testimonialsRef, testimonialsVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.05 });

  const METRICS = [
    { val: "50,000+", label: "PRs Reviewed" },
    { val: "99.4%", label: "Syntactic Accuracy" },
    { val: "35+", label: "Languages Supported" },
    { val: "<2.8s", label: "Median Latency" },
  ];

  return (
    <section
      id="proof"
      className={cn(
        "py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 w-full overflow-hidden",
        className
      )}
      aria-labelledby="proof-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={cn("text-center max-w-3xl mx-auto mb-16 sr-fade-up", headerVisible && "is-visible")}
        >
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

        {/* Animated Metric Strip */}
        <div
          ref={metricsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
        >
          {METRICS.map((m, idx) => (
            <AnimatedMetric
              key={m.label}
              rawValue={m.val}
              label={m.label}
              isVisible={metricsVisible}
              delay={idx * 100}
            />
          ))}
        </div>

        {/* Company Logos — auto-scrolling marquee */}
        <div
          className="relative mb-16 overflow-hidden"
          aria-label="Companies using Anuvaad"
        >
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-50 dark:from-slate-900/50 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-50 dark:from-slate-900/50 to-transparent z-10" />

          <div className="flex overflow-hidden">
            {/* Double the logos for seamless loop */}
            <div
              className="flex gap-10 sm:gap-16 items-center py-4"
              style={{ animation: "marquee-left 28s linear infinite", width: "max-content" }}
              aria-hidden="true"
            >
              {[...COMPANY_LOGOS, ...COMPANY_LOGOS].map((company, i) => (
                <span
                  key={`${company}-${i}`}
                  className="text-sm sm:text-base font-bold tracking-widest text-slate-400/70 dark:text-slate-500/70 uppercase whitespace-nowrap select-none hover:text-amber-500/70 transition-colors duration-300"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonials Grid — staggered reveal */}
        <div
          ref={testimonialsRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {TESTIMONIALS_DATA.map((t, idx) => (
            <div
              key={t.id}
              className={cn(
                "group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs flex flex-col justify-between",
                "hover:border-amber-500/40 hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300",
                "sr-fade-up",
                testimonialsVisible && "is-visible"
              )}
              style={{ "--sr-delay": `${idx * 80}ms` } as React.CSSProperties}
            >
              <div>
                {/* Stars */}
                <div className="flex items-center gap-1 mb-4" aria-label={`${t.rating} out of 5 stars`}>
                  {[...Array(t.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-500 text-amber-500 group-hover:scale-110 transition-transform"
                      style={{ transitionDelay: `${i * 30}ms` }}
                      aria-hidden="true"
                    />
                  ))}
                </div>

                {/* Quote mark */}
                <div className="text-4xl font-serif text-amber-500/20 group-hover:text-amber-500/40 leading-none mb-2 transition-colors duration-300" aria-hidden="true">
                  &ldquo;
                </div>

                <blockquote className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                  {t.quote}
                </blockquote>

                {/* Highlight badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                  {t.highlight}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                {/* Avatar with amber ring on hover */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs ring-2 ring-transparent group-hover:ring-amber-500/30 transition-all duration-300 shrink-0">
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
