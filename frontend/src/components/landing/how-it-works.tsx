import { ClipboardPaste, Cpu, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    icon: ClipboardPaste,
    step: "01",
    title: "Paste your code",
    description:
      "Drop any code snippet into the editor. We support 35+ languages — Python, JavaScript, Java, C++, Rust, Go, Swift, Kotlin, SQL, and more — with full syntax highlighting.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI analyzes it",
    description:
      "Groq and DeepSeek break your code into logical blocks and generate clear, beginner-friendly explanations for each section.",
  },
  {
    icon: FileText,
    step: "03",
    title: "Read & export",
    description:
      "Read plain English translations, edit explanations to regenerate code, and export as Markdown, JSON, or PDF.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative border-t border-white/5 py-32 bg-transparent">
      {/* Soft gradient background glow */}
      <div className="pointer-events-none absolute right-10 bottom-10 -z-10 h-[300px] w-[500px] rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="cinematic-reveal mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-400"
          >
            How It Works
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            Three steps to clarity
          </h2>
        </div>

        <div className="mt-20 grid gap-12 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="cinematic-reveal relative text-center group">
              {/* Outer glow ring around icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-[#060613]/70 backdrop-blur-md shadow-lg transition-all duration-300 group-hover:border-indigo-500/25 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <item.icon className="h-7 w-7 text-indigo-400" />
              </div>
              
              {/* Step number badge */}
              <p className="mt-6 font-mono text-[10px] font-extrabold uppercase tracking-widest text-indigo-400/80">
                Step {item.step}
              </p>
              
              <h3 className="mt-3 text-lg font-bold text-white tracking-tight">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400 max-w-xs mx-auto">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
