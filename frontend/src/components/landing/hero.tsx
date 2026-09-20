"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Play, Loader2 } from "lucide-react";
import gsap from "gsap";
import { useLenis } from "@/components/landing/LenisScrollProvider";

// Language tabs for the interactive demo
const LANGUAGES = [
  { key: "python",     label: "Python",     ext: "py"  },
  { key: "javascript", label: "JavaScript", ext: "js"  },
  { key: "typescript", label: "TypeScript", ext: "ts"  },
  { key: "go",         label: "Go",         ext: "go"  },
  { key: "rust",       label: "Rust",       ext: "rs"  },
  { key: "java",       label: "Java",       ext: "java"},
];

const PRESETS: Record<string, string> = {
  python: `def fibonacci(n):\n  if n <= 1:\n    return n\n  return fibonacci(n-1) + fibonacci(n-2)`,
  javascript: `const debounce = (fn, delay) =>\n  (...args) => {\n    clearTimeout(timer)\n    timer = setTimeout(() =>\n      fn(...args), delay)\n  }`,
  typescript: `interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nasync function fetchUser(id: string): Promise<User> {\n  const res = await fetch(\`/api/users/\${id}\`);\n  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n  return res.json() as Promise<User>;\n}`,
  go: `func fetchUser(id string) (*User, error) {\n  resp, err := http.Get("/users/" + id)\n  if err != nil {\n    return nil, err\n  }\n  defer resp.Body.Close()\n  var user User\n  if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {\n    return nil, err\n  }\n  return &user, nil\n}`,
  rust: `async fn fetch_user(id: &str) -> Result<User, reqwest::Error> {\n    let url = format!("/users/{}", id);\n    reqwest::get(&url).await?.json::<User>().await\n}`,
  java: `public CompletableFuture<User> fetchUser(String id) {\n    return HttpClient.newHttpClient()\n        .sendAsync(\n            HttpRequest.newBuilder()\n                .uri(URI.create("/users/" + id))\n                .build(),\n            HttpResponse.BodyHandlers.ofString()\n        )\n        .thenApply(r -> gson.fromJson(r.body(), User.class));\n}`,
};

const WAVE_HEIGHTS = [14, 26, 40, 54, 66, 54, 42, 30, 18, 30, 46, 60, 48, 32, 20, 34, 50, 62, 46, 30];

type DemoState = "idle" | "loading" | "success" | "rate_limited";

/** Inline SVG illustration — code-scroll line art (Illustration element) */
function CodeScrollIllustration({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="wispr-illustration wispr-illustration-float absolute right-8 top-1/4 hidden xl:block opacity-40 pointer-events-none select-none"
      style={style}
    >
      <svg
        width="180"
        height="220"
        viewBox="0 0 180 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="wispr-line-draw"
        aria-hidden="true"
      >
        {/* Code scroll — hand-drawn / line-art style */}
        {/* Scroll body */}
        <rect x="20" y="30" width="140" height="160" rx="8" stroke="#c8860a" strokeWidth="1.5" fill="none" />
        {/* Top curl */}
        <path d="M20 38 Q20 20 40 20 L160 20 Q180 20 180 38 L180 30 Q180 18 160 18 L40 18 Q18 18 18 38 Z" stroke="#c8860a" strokeWidth="1" fill="none" />
        {/* Bottom curl */}
        <path d="M20 182 Q20 200 40 200 L160 200 Q180 200 180 182" stroke="#c8860a" strokeWidth="1" fill="none" />
        {/* Code lines — flat minimalism horizontal rules */}
        <line x1="40" y1="65"  x2="130" y2="65"  stroke="#034f46" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="52" y1="82"  x2="140" y2="82"  stroke="#034f46" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="52" y1="99"  x2="120" y2="99"  stroke="#1a1208" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <line x1="40" y1="116" x2="145" y2="116" stroke="#034f46" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="52" y1="133" x2="110" y2="133" stroke="#1a1208" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <line x1="40" y1="150" x2="135" y2="150" stroke="#c8860a" strokeWidth="1.5" strokeLinecap="round" />
        {/* Arrow — translation direction */}
        <path d="M75 175 L105 175 M98 169 L105 175 L98 181" stroke="#c8860a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Indent dots */}
        <circle cx="46" cy="82" r="2" fill="#034f46" />
        <circle cx="46" cy="99" r="2" fill="#1a1208" opacity="0.4" />
        <circle cx="46" cy="133" r="2" fill="#1a1208" opacity="0.4" />
      </svg>
    </div>
  );
}

/** Organic SVG wave divider between hero and next section */
function WaveDivider() {
  return (
    <div className="wispr-wave-divider absolute bottom-0 left-0 right-0 z-10 pointer-events-none" style={{ height: 80 }}>
      <svg
        viewBox="0 0 1440 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
        aria-hidden="true"
      >
        {/* Organic wave curve — transitions from cream hero to cream features */}
        <path
          d="M0 40 C240 0 480 80 720 40 C960 0 1200 80 1440 40 L1440 80 L0 80 Z"
          fill="rgba(26,18,8,0.03)"
        />
      </svg>
    </div>
  );
}

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, isReducedMotion } = useLenis();
  const heroProgress = Math.min(scrollProgress / 0.15, 1.0);
  const [activeLang, setActiveLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(PRESETS["python"]);
  const [englishText, setEnglishText] = useState<string>("");
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [remaining, setRemaining] = useState<number | null>(null);

  // Motion: GSAP entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.15 });
      tl.fromTo(".v1-eyebrow", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" });
      tl.fromTo(
        ".v1-word",
        { opacity: 0, y: 44, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.0, ease: "power4.out", stagger: 0.09 },
        "-=0.4"
      );
      tl.fromTo(".v1-sub", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.6");
      tl.fromTo(".v1-ctas", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, "-=0.5");
      tl.fromTo(".v1-wave-bar", { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.45, ease: "back.out(1.4)", stagger: 0.02 }, "-=0.4");
      tl.fromTo(".v1-demo", { opacity: 0, y: 24, scale: 0.99 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power4.out" }, "-=0.45");
      tl.fromTo(".wispr-illustration", { opacity: 0, x: 20 }, { opacity: 0.4, x: 0, duration: 1.0, ease: "power3.out" }, "-=0.7");
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const runTranslation = useCallback(async (lang: string, codeInput: string) => {
    if (!codeInput.trim() || demoState === "loading") return;
    setDemoState("loading");
    setEnglishText("");
    try {
      const res = await fetch(`/api/demo/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, mode: "code-to-english" }),
      });
      const data = await res.json();
      if (res.status === 429) { setDemoState("rate_limited"); return; }
      if (!res.ok) throw new Error(data.detail || "Translation failed");
      const translation = data.blocks?.[0]?.english_translation ?? "Translation complete.";
      setEnglishText(translation);
      setRemaining(data.remaining_demo_requests ?? null);
      setDemoState("success");
    } catch {
      setDemoState("idle");
    }
  }, [demoState]);

  const handleLangSwitch = (lang: typeof LANGUAGES[0]) => {
    setActiveLang(lang);
    setCode(PRESETS[lang.key]);
    setEnglishText("");
    setDemoState("idle");
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-screen flex flex-col overflow-hidden wispr-hero-bg"
      style={{ perspective: isReducedMotion ? "none" : "1000px", transformStyle: "preserve-3d" }}
    >
      {/* Illustration element — code scroll line art */}
      <CodeScrollIllustration
        style={{
          transform: isReducedMotion
            ? "none"
            : `perspective(1000px) rotateY(${heroProgress * -20}deg) translateZ(${heroProgress * 50}px) translateY(${heroProgress * -30}px)`,
          transformStyle: "preserve-3d",
        }}
      />

      <div className="flex-1 flex flex-col items-center justify-center pt-28 pb-20 px-6">
        <div className="mx-auto max-w-4xl text-center w-full">

          {/* Eyebrow — Modern Sans */}
          <div className="v1-eyebrow wispr-eyebrow text-neutral-500 opacity-0 mb-6 flex items-center justify-center gap-2">
            <span className="wispr-speaking-dot" />
            AI-Powered Code Comprehension
          </div>

          {/* Giant Editorial Serif headline — Playfair Display */}
          <h1
            className="v1-word wispr-headline text-[#1a1208] mb-7"
            style={{
              fontSize: "clamp(52px, 8vw, 96px)",
              transform: isReducedMotion
                ? "none"
                : `translate3d(0px, ${heroProgress * -50}px, ${heroProgress * -100}px) rotateX(${heroProgress * 15}deg)`,
              opacity: isReducedMotion ? 1 : Math.max(0, 1 - heroProgress * 1.2),
              transition: "transform 0.1s linear, opacity 0.1s linear",
              transformStyle: "preserve-3d",
            }}
          >
            <span className="v1-word inline-block opacity-0">Every</span>{" "}
            <span className="v1-word inline-block opacity-0">Codebase</span>
            <br className="hidden sm:block" />
            <span
              className="v1-word inline-block opacity-0 italic"
              style={{ color: "#c8860a" }}
            >
              Has a Story.
            </span>
          </h1>

          {/* Sub — Modern Sans */}
          <p className="v1-sub opacity-0 mx-auto mb-10 max-w-xl text-[17px] leading-relaxed text-[#6b5e4a]"
            style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
          >
            The AI code translator that turns{" "}
            <span className="text-[#1a1208] font-medium">obscure logic</span>{" "}
            into plain English — and back into production-ready code.
          </p>

          {/* CTAs — Organic Curve pill buttons */}
          <div className="v1-ctas opacity-0 flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <Link href="/signup" id="hero-try-btn" className="wispr-btn-primary">
              Try Anuvaad Free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#story" id="hero-story-btn" className="wispr-btn-secondary">
              See how it works
            </a>
          </div>

          {/* Trust strip — ink checkmarks */}
          <div className="v1-ctas opacity-0 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mb-12">
            {["Free forever", "No credit card required", "10 translations / day"].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-[12px] text-[#9e8d72]"
                style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
              >
                <svg className="h-3 w-3 text-[#c8860a] shrink-0" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </div>
            ))}
          </div>

          {/* Waveform visualizer — Motion element */}
          <div className="flex items-end justify-center gap-[3px] mb-12" style={{ height: 72 }}>
            {WAVE_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="v1-wave-bar wispr-wave-bar opacity-0 rounded-full"
                style={{
                  width: 4,
                  height: h,
                  backgroundColor: i % 3 === 0 ? "#c8860a" : i % 3 === 1 ? "#a36708" : "#e8a830",
                  "--wave-dur": `${0.6 + (i % 5) * 0.18}s`,
                  "--wave-delay": `${i * 0.06}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* ── INTERACTIVE LIVE DEMO PANEL — Deep Dark Room + Ink Border ── */}
          <div
            className="v1-demo opacity-0 mx-auto max-w-4xl"
            style={{
              transform: isReducedMotion
                ? "none"
                : `perspective(1000px) rotateX(${heroProgress * 12}deg) translateZ(${heroProgress * -40}px)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.1s linear",
            }}
          >
            <div
              className="wispr-dark-section overflow-hidden"
              style={{ borderRadius: 28 }}
            >
              {/* Header — language tabs */}
              <div className="flex items-center justify-between wispr-ink-border-dark px-4 py-3 bg-black/20">
                {/* macOS dots */}
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/50" />
                </div>

                {/* Language tab strip — Modern Sans */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-1">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.key}
                      onClick={() => handleLangSwitch(lang)}
                      className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                        activeLang.key === lang.key
                          ? "border border-[rgba(200,134,10,0.4)] bg-[rgba(200,134,10,0.10)] text-[#e8a830]"
                          : "border border-transparent text-white/25 hover:text-white/50"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${demoState === "loading" ? "bg-[#e8a830] animate-pulse" : demoState === "success" ? "bg-green-400" : "bg-white/20"}`}
                  />
                  <span className="font-mono text-[10px] text-[rgba(200,134,10,0.6)] uppercase tracking-widest hidden sm:block">
                    {demoState === "loading" ? "Translating..." : demoState === "success" ? "Complete" : "Code → English"}
                  </span>
                </div>
              </div>

              {/* Content — editable textarea + result */}
              <div className="grid md:grid-cols-2 min-h-[220px]">
                {/* Left — editable code input */}
                <div className="bg-black/15 p-6 md:border-r md:border-white/[0.06] flex flex-col">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25"
                    style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}>
                    Your Code · <span className="text-white/15">.{activeLang.ext}</span>
                  </p>
                  <textarea
                    aria-label="Code editor"
                    title="Code editor"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setDemoState("idle"); }}
                    onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runTranslation(activeLang.key, code); }}
                    spellCheck={false}
                    placeholder="Paste your code here..."
                    className="flex-1 resize-none bg-transparent font-mono text-[13px] leading-relaxed text-slate-300 outline-none placeholder-white/15 min-h-[150px]"
                    style={{ tabSize: 2 }}
                  />
                </div>

                {/* Right — translation output — Editorial Serif result */}
                <div className="bg-transparent p-6 flex flex-col">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(200,134,10,0.55)]"
                    style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}>
                    Plain English
                  </p>

                  {demoState === "rate_limited" ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-4">
                      <p className="text-sm text-neutral-400">You&apos;ve used all 3 demo translations today.</p>
                      <Link
                        href="/signup"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#c8860a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b07308] transition-all"
                      >
                        Create free account — get 10/day <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : demoState === "loading" ? (
                    <div className="flex-1 flex flex-col gap-3 justify-center py-4">
                      {[100, 85, 70, 50].map((w, i) => (
                        <div key={i} className="h-3 rounded-full bg-white/[0.06] animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  ) : (
                    /* Editorial Serif for translation output */
                    <p
                      className="flex-1 text-[15px] leading-relaxed text-slate-300 min-h-[150px] italic"
                      style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))" }}
                    >
                      {englishText || (
                        <span className="text-white/20 not-italic text-[13px]"
                          style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}>
                          Translation will appear here. Hit the button or press Ctrl+Enter.
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer — translate button */}
              <div className="wispr-ink-border-dark bg-black/20 px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => runTranslation(activeLang.key, code)}
                    disabled={demoState === "loading" || demoState === "rate_limited"}
                    className="flex items-center gap-2 rounded-full bg-[#c8860a] px-4 py-1.5 text-[11px] font-bold text-white hover:bg-[#b07308] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
                  >
                    {demoState === "loading" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Translate{" "}
                    <span className="hidden sm:inline text-[rgba(255,220,160,0.6)] font-normal">· Ctrl+Enter</span>
                  </button>
                  {remaining !== null && demoState === "success" && (
                    <span className="text-[10px] font-mono text-white/20">
                      {remaining} demo {remaining === 1 ? "use" : "uses"} left today
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-white/15 hidden sm:block">
                  Free to start · No credit card required
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
        <span className="wispr-eyebrow text-[#9e8d72]">Scroll</span>
        <div className="h-10 w-px bg-gradient-to-b from-[rgba(26,18,8,0.35)] to-transparent" />
      </div>

      {/* Organic wave divider — section transition */}
      <WaveDivider />
    </section>
  );
}
