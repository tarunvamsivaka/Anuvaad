import { ClipboardPaste, Cpu, FileText } from "lucide-react";

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
      "Gemini 2.5 Flash breaks your code into logical blocks and generates clear, beginner-friendly explanations for each section.",
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
    <section className="border-t border-border/40 bg-muted/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps to clarity
          </h2>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="relative text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <item.icon className="h-6 w-6 text-amber-600" />
              </div>
              <p className="mt-5 font-mono text-xs font-bold uppercase tracking-wider text-amber-600">
                Step {item.step}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
