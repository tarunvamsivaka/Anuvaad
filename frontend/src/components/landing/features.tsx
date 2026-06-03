import {
  Code2,
  Languages,
  Zap,
  Shield,
  Download,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Code2,
    title: "Code → English",
    description:
      "Paste any code and get a clear, block-by-block explanation in plain English. Perfect for understanding unfamiliar codebases.",
  },
  {
    icon: Languages,
    title: "Code → Code",
    description:
      "Translate between 35+ languages — Python, JavaScript, C++, Java, SQL, HTML, CSS, Rust, Go, Kotlin, Swift, and many more.",
  },
  {
    icon: BookOpen,
    title: "English → Code",
    description:
      "Describe what you want in natural language and get working, production-ready code generated instantly.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description:
      "Powered by Groq and DeepSeek with intelligent caching. Most translations complete in under 3 seconds.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description:
      "Your code is never stored on our servers. Processed in real-time and returned to your browser immediately.",
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description:
      "Export your translations as Markdown, JSON, or PDF. Share with teammates or save for documentation.",
  },
];

export function Features() {
  return (
    <section className="relative border-t border-white/5 py-32 bg-transparent">
      <div className="mx-auto max-w-6xl px-6">
        <div className="cinematic-reveal mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-400"
          >
            Features
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            Everything you need to understand code
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Three powerful modes, 35+ languages, and instant AI-powered results.
          </p>
        </div>

        <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="cinematic-reveal group rounded-2xl border border-white/5 bg-[#060613]/60 p-8 shadow-xl shadow-black/40 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/20 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(99,102,241,0.05)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 transition-all duration-300 group-hover:bg-indigo-500/20 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <feature.icon className="h-6 w-6 text-indigo-400 transition-colors" />
              </div>
              <h3 className="mt-6 text-lg font-bold text-white tracking-tight">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
