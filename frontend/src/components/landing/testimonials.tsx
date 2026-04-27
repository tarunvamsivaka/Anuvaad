"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "Anuvaad saved me hours reverse-engineering a legacy Java codebase. The line-by-line explanations are incredibly precise.",
    name: "Priya Sharma",
    role: "Senior Backend Engineer",
    company: "Flipkart",
    avatar: "PS",
  },
  {
    quote:
      "I use Code → Code to port Python prototypes to Go for production. It handles edge cases better than any tool I've tried.",
    name: "Alex Chen",
    role: "Platform Lead",
    company: "Stripe",
    avatar: "AC",
  },
  {
    quote:
      "As a CS student, Anuvaad is like having a patient tutor. I paste lecture code and actually understand what each line does.",
    name: "Jordan Miller",
    role: "Computer Science Student",
    company: "Georgia Tech",
    avatar: "JM",
  },
  {
    quote:
      "Our team uses the workspace feature to standardize how we document microservices. The API key integration with CI/CD is brilliant.",
    name: "Maria Garcia",
    role: "Engineering Manager",
    company: "Shopify",
    avatar: "MG",
  },
  {
    quote:
      "Translating SQL queries to plain English helped our product team finally understand our analytics pipeline. Game changer.",
    name: "David Kim",
    role: "Data Engineering Lead",
    company: "Notion",
    avatar: "DK",
  },
  {
    quote:
      "The Pro plan pays for itself in the first week. I translate 20+ snippets a day during code reviews.",
    name: "Rahul Patel",
    role: "Staff Engineer",
    company: "Razorpay",
    avatar: "RP",
  },
];

export function Testimonials() {
  return (
    <section className="border-t border-border/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
            Testimonials
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by developers worldwide
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From students to staff engineers — teams rely on Anuvaad every day.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative flex flex-col rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-border hover:shadow-md"
            >
              {/* Quote */}
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="mt-6 flex items-center gap-3 border-t border-border/40 pt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-xs font-bold text-amber-700 dark:text-amber-400">
                  {t.avatar}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {t.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.role} · {t.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
