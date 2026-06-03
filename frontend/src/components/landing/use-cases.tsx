import {
  GraduationCap,
  Code2,
  Users,
  Bug,
  FileSearch,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const useCases = [
  {
    icon: FileSearch,
    title: "Onboarding & Code Review",
    description:
      "New to a codebase? Paste any file into Anuvaad and get instant, line-by-line explanations — no more waiting for a walkthrough.",
    audience: "New hires & reviewers",
    color: "from-blue-500/10 to-blue-600/10 border-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: GraduationCap,
    title: "Learning & Education",
    description:
      "Students paste lecture examples and see exactly what each statement does. Professors use it to auto-generate teaching materials.",
    audience: "Students & educators",
    color: "from-emerald-500/10 to-emerald-600/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: Code2,
    title: "Language Migration",
    description:
      "Porting a Python prototype to Go? Migrating Java to Kotlin? Code → Code mode produces idiomatic translations you can actually ship.",
    audience: "Platform engineers",
    color: "from-amber-500/10 to-amber-600/10 border-amber-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Bug,
    title: "Debugging & Reverse Engineering",
    description:
      "Understand minified, obfuscated, or legacy code by translating it to plain English. Spot bugs by reading explanations instead of syntax.",
    audience: "Debugging engineers",
    color: "from-red-500/10 to-red-600/10 border-red-500/20",
    iconColor: "text-red-400",
  },
  {
    icon: Users,
    title: "Cross-Team Communication",
    description:
      "Share English explanations with product managers, designers, and non-technical stakeholders who need to understand system logic.",
    audience: "Engineering leaders",
    color: "from-purple-500/10 to-purple-600/10 border-purple-500/20",
    iconColor: "text-purple-400",
  },
  {
    icon: Briefcase,
    title: "Technical Documentation",
    description:
      "Auto-generate documentation from code. Export as Markdown and drop directly into your wiki, README, or internal docs.",
    audience: "DevOps & tech writers",
    color: "from-cyan-500/10 to-cyan-600/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
  },
];

export function UseCases() {
  return (
    <section className="relative border-t border-white/5 py-32 bg-transparent">
      <div className="mx-auto max-w-6xl px-6">
        <div className="cinematic-reveal mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-400"
          >
            Use Cases
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            Built for every workflow
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Whether you&apos;re learning, debugging, or shipping — Anuvaad fits your process.
          </p>
        </div>

        <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((uc) => (
            <div
              key={uc.title}
              className="cinematic-reveal group rounded-2xl border border-white/5 bg-[#060613]/60 p-8 shadow-xl shadow-black/40 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/20 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(99,102,241,0.05)]"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br border ${uc.color}`}
              >
                <uc.icon className={`h-6 w-6 ${uc.iconColor}`} />
              </div>
              
              <h3 className="mt-6 text-lg font-bold text-white tracking-tight">{uc.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{uc.description}</p>
              
              <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
                {uc.audience}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
