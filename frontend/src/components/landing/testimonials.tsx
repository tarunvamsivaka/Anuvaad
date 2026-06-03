"use client";

const TESTIMONIALS = [
  {
    quote: "Anuvaad saved me hours reverse-engineering a legacy Java codebase. The line-by-line explanations are incredibly precise.",
    name: "Priya Sharma",
    role: "Senior Backend Engineer",
    company: "Flipkart",
    avatar: "PS",
  },
  {
    quote: "I use Code → Code to port Python prototypes to Go for production. It handles edge cases better than any tool I've tried.",
    name: "Alex Chen",
    role: "Platform Lead",
    company: "Stripe",
    avatar: "AC",
  },
  {
    quote: "As a CS student, Anuvaad is like having a patient tutor. I paste lecture code and actually understand what each line does.",
    name: "Jordan Miller",
    role: "Computer Science Student",
    company: "Georgia Tech",
    avatar: "JM",
  },
  {
    quote: "Our team uses the workspace feature to standardize how we document microservices. The API key integration with CI/CD is brilliant.",
    name: "Maria Garcia",
    role: "Engineering Manager",
    company: "Shopify",
    avatar: "MG",
  },
  {
    quote: "Translating SQL queries to plain English helped our product team finally understand our analytics pipeline. Game changer.",
    name: "David Kim",
    role: "Data Engineering Lead",
    company: "Notion",
    avatar: "DK",
  },
  {
    quote: "The Pro plan pays for itself in the first week. I translate 20+ snippets a day during code reviews.",
    name: "Rahul Patel",
    role: "Staff Engineer",
    company: "Razorpay",
    avatar: "RP",
  },
  {
    quote: "Finally a tool that explains WHY code was written, not just what it does. This is how AI tools should work.",
    name: "Sophie Laurent",
    role: "Principal Engineer",
    company: "Datadog",
    avatar: "SL",
  },
  {
    quote: "Onboarded 3 junior devs to our TypeScript monorepo in a single afternoon using Anuvaad. Normally takes weeks.",
    name: "James O.",
    role: "Tech Lead",
    company: "Linear",
    avatar: "JO",
  },
];

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[0] }) {
  return (
    <div className="flex-shrink-0 w-[340px] glass-amber rounded-2xl p-6 mx-3 transition-all duration-300 hover:border-amber-500/25 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)]">
      {/* Amber quote mark */}
      <div
        className="mb-3 text-4xl leading-none text-amber-500/25 select-none"
        style={{ fontFamily: "var(--font-lora, Georgia, serif)" }}
        aria-hidden="true"
      >
        &ldquo;
      </div>
      <p
        className="mb-5 text-sm leading-relaxed text-slate-300"
        style={{ fontFamily: "var(--font-lora, Georgia, serif)", fontStyle: "italic" }}
      >
        {t.quote}
      </p>
      <div className="flex items-center gap-3 border-t border-amber-500/8 pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-xs font-bold text-amber-400 border border-amber-500/20">
          {t.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{t.name}</p>
          <p className="text-xs text-slate-500">{t.role} · {t.company}</p>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  // Duplicate the array to create infinite loop illusion
  const row1 = [...TESTIMONIALS, ...TESTIMONIALS];
  const row2 = [...TESTIMONIALS.slice(4), ...TESTIMONIALS.slice(0, 4), ...TESTIMONIALS.slice(4), ...TESTIMONIALS.slice(0, 4)];

  return (
    <section className="landing-section relative border-t border-amber-500/8 py-32 overflow-hidden">
      {/* Fade masks */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#020204] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#020204] to-transparent" />

      <div className="mx-auto mb-16 max-w-2xl px-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
          Testimonials
        </div>
        <h2
          className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
          style={{ fontFamily: "var(--font-lora, Georgia, serif)" }}
        >
          Loved by developers{" "}
          <span className="headline-gradient">worldwide.</span>
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          From students to staff engineers — teams rely on Anuvaad every day.
        </p>
      </div>

      {/* Row 1 — scrolls left */}
      <div className="mb-4 overflow-hidden">
        <div className="marquee-track marquee-left">
          {row1.map((t, i) => (
            <TestimonialCard key={`r1-${i}`} t={t} />
          ))}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div className="overflow-hidden">
        <div className="marquee-track marquee-right">
          {row2.map((t, i) => (
            <TestimonialCard key={`r2-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
