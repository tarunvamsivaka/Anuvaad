import {
  Code2,
  Languages,
  Zap,
  Shield,
  Download,
  BookOpen,
} from "lucide-react";

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
      "Powered by Gemini 2.5 Flash with intelligent caching. Most translations complete in under 3 seconds.",
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
    <section id="features" className="border-t border-border/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to understand code
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three powerful modes, 35+ languages, and instant AI-powered
            results.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-border hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10">
                <feature.icon className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
