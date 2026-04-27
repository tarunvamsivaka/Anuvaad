"use client";

import { motion } from "framer-motion";
import {
  GraduationCap,
  Code2,
  Users,
  Bug,
  FileSearch,
  Briefcase,
} from "lucide-react";

const useCases = [
  {
    icon: FileSearch,
    title: "Onboarding & Code Review",
    description:
      "New to a codebase? Paste any file into Anuvaad and get instant, line-by-line explanations — no more waiting for a walkthrough.",
    audience: "New hires & reviewers",
    color: "from-blue-500/10 to-blue-600/10",
    iconColor: "text-blue-600",
  },
  {
    icon: GraduationCap,
    title: "Learning & Education",
    description:
      "Students paste lecture examples and see exactly what each statement does. Professors use it to auto-generate teaching materials.",
    audience: "Students & educators",
    color: "from-emerald-500/10 to-emerald-600/10",
    iconColor: "text-emerald-600",
  },
  {
    icon: Code2,
    title: "Language Migration",
    description:
      "Porting a Python prototype to Go? Migrating Java to Kotlin? Code → Code mode produces idiomatic translations you can actually ship.",
    audience: "Platform engineers",
    color: "from-amber-500/10 to-amber-600/10",
    iconColor: "text-amber-600",
  },
  {
    icon: Bug,
    title: "Debugging & Reverse Engineering",
    description:
      "Understand minified, obfuscated, or legacy code by translating it to plain English. Spot bugs by reading explanations instead of syntax.",
    audience: "Debugging engineers",
    color: "from-red-500/10 to-red-600/10",
    iconColor: "text-red-600",
  },
  {
    icon: Users,
    title: "Cross-Team Communication",
    description:
      "Share English explanations with product managers, designers, and non-technical stakeholders who need to understand system logic.",
    audience: "Engineering leaders",
    color: "from-purple-500/10 to-purple-600/10",
    iconColor: "text-purple-600",
  },
  {
    icon: Briefcase,
    title: "Technical Documentation",
    description:
      "Auto-generate documentation from code. Export as Markdown and drop directly into your wiki, README, or internal docs.",
    audience: "DevOps & tech writers",
    color: "from-cyan-500/10 to-cyan-600/10",
    iconColor: "text-cyan-600",
  },
];

export function UseCases() {
  return (
    <section className="border-t border-border/40 bg-muted/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
            Use Cases
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built for every workflow
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you&apos;re learning, debugging, or shipping — Anuvaad fits
            your process.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-border hover:shadow-md"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${uc.color}`}
              >
                <uc.icon className={`h-5 w-5 ${uc.iconColor}`} />
              </div>
              <h3 className="mt-4 text-base font-semibold">{uc.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {uc.description}
              </p>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {uc.audience}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
