"use client";

const TESTIMONIALS = [
  {
    quote: "Anuvaad saved me hours reverse-engineering a legacy Java codebase. The line-by-line explanations are incredibly precise.",
    name: "Priya Sharma",
    role: "Senior Backend Engineer",
    company: "Flipkart",
    avatar: "PS",
    hue: "from-amber-200 to-orange-100",
    textColor: "text-amber-800",
  },
  {
    quote: "I use Code → Code to port Python prototypes to Go for production. It handles edge cases better than any tool I've tried.",
    name: "Alex Chen",
    role: "Platform Lead",
    company: "Stripe",
    avatar: "AC",
    hue: "from-sky-200 to-blue-100",
    textColor: "text-sky-800",
  },
  {
    quote: "As a CS student, Anuvaad is like having a patient tutor. I paste lecture code and actually understand what each line does.",
    name: "Jordan Miller",
    role: "Computer Science Student",
    company: "Georgia Tech",
    avatar: "JM",
    hue: "from-violet-200 to-purple-100",
    textColor: "text-violet-800",
  },
  {
    quote: "Our team uses the workspace feature to standardize how we document microservices. The API key integration with CI/CD is brilliant.",
    name: "Maria Garcia",
    role: "Engineering Manager",
    company: "Shopify",
    avatar: "MG",
    hue: "from-emerald-200 to-green-100",
    textColor: "text-emerald-800",
  },
  {
    quote: "Translating SQL queries to plain English helped our product team finally understand our analytics pipeline. Game changer.",
    name: "David Kim",
    role: "Data Engineering Lead",
    company: "Notion",
    avatar: "DK",
    hue: "from-rose-200 to-pink-100",
    textColor: "text-rose-800",
  },
  {
    quote: "The Pro plan pays for itself in the first week. I translate 20+ snippets a day during code reviews.",
    name: "Rahul Patel",
    role: "Staff Engineer",
    company: "Razorpay",
    avatar: "RP",
    hue: "from-amber-200 to-yellow-100",
    textColor: "text-amber-800",
  },
  {
    quote: "Finally a tool that explains WHY code was written, not just what it does. This is how AI tools should work.",
    name: "Sophie Laurent",
    role: "Principal Engineer",
    company: "Datadog",
    avatar: "SL",
    hue: "from-indigo-200 to-blue-100",
    textColor: "text-indigo-800",
  },
  {
    quote: "Onboarded 3 junior devs to our TypeScript monorepo in a single afternoon using Anuvaad. Normally takes weeks.",
    name: "James O.",
    role: "Tech Lead",
    company: "Linear",
    avatar: "JO",
    hue: "from-teal-200 to-cyan-100",
    textColor: "text-teal-800",
  },
];

function StarRating() {
  return (
    <div className="flex items-center gap-0.5 mb-4">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[0] }) {
  return (
    <div className="flex-shrink-0 w-[340px] bg-white rounded-3xl border border-black/07 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 mx-3 transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.10)] hover:border-amber-200/60">
      {/* Stars */}
      <StarRating />

      {/* Quote mark */}
      <div
        className="mb-3 text-4xl leading-none select-none"
        style={{ color: "rgba(200,134,10,0.18)", fontFamily: "var(--font-garamond, Georgia, serif)" }}
        aria-hidden="true"
      >
        &ldquo;
      </div>
      <p
        className="mb-5 text-sm leading-relaxed text-neutral-600"
        style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontStyle: "italic" }}
      >
        {t.quote}
      </p>
      <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.hue} text-xs font-bold ${t.textColor} border border-white/60 shadow-sm`}>
          {t.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">{t.name}</p>
          <p className="text-xs text-neutral-400">{t.role} · <span className="font-medium text-neutral-500">{t.company}</span></p>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  // Duplicate once for seamless marquee — correct length for both rows
  const row1 = [...TESTIMONIALS, ...TESTIMONIALS];
  const row2 = [...TESTIMONIALS.slice(4), ...TESTIMONIALS.slice(0, 4), ...TESTIMONIALS.slice(4), ...TESTIMONIALS.slice(0, 4)];

  return (
    <section className="wispr-section-light relative py-32 overflow-hidden">
      {/* Fade masks — cream colour */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#f5f3ef] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#f5f3ef] to-transparent" />

      {/* Section header */}
      <div className="mx-auto mb-16 max-w-2xl px-6 text-center">
        <div className="wispr-eyebrow-pill-light mb-5">
          Testimonials
        </div>
        <h2
          className="wispr-headline text-neutral-900 mb-4"
          style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
        >
          Loved by developers{" "}
          <span style={{ color: "#c8860a", fontStyle: "italic" }}>worldwide.</span>
        </h2>
        <p className="text-[17px] text-neutral-500 leading-relaxed">
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
