"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Play, Loader2 } from "lucide-react";
import gsap from "gsap";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Language tabs for the interactive demo
const LANGUAGES = [
  { key: "python",     label: "Python",     ext: "py"  },
  { key: "javascript", label: "JavaScript", ext: "js"  },
  { key: "typescript", label: "TypeScript", ext: "ts"  },
  { key: "go",         label: "Go",         ext: "go"  },
  { key: "rust",       label: "Rust",       ext: "rs"  },
  { key: "java",       label: "Java",       ext: "java"},
];

// Preset code snippets for each language
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

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active language tab
  const [activeLang, setActiveLang] = useState(LANGUAGES[0]);
  // The code in the textarea
  const [code, setCode] = useState(PRESETS["python"]);
  // The english translation result
  const [englishText, setEnglishText] = useState<string>("");
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [remaining, setRemaining] = useState<number | null>(null);

  // GSAP entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });
      tl.fromTo(".v1-eyebrow", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" });
      tl.fromTo(
        ".v1-word",
        { opacity: 0, y: 48, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1, ease: "power4.out", stagger: 0.1 },
        "-=0.4"
      );
      tl.fromTo(".v1-sub", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.65");
      tl.fromTo(".v1-ctas", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, "-=0.55");
      tl.fromTo(".v1-wave-bar", { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.5, ease: "back.out(1.4)", stagger: 0.02 }, "-=0.4");
      tl.fromTo(".v1-demo", { opacity: 0, y: 28, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: "power4.out" }, "-=0.5");
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Call the real demo API
  const runTranslation = useCallback(async (lang: string, codeInput: string) => {
    if (!codeInput.trim() || demoState === "loading") return;
    setDemoState("loading");
    setEnglishText("");
    try {
      const res = await fetch(`${API_BASE}/api/demo/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, mode: "code-to-english" }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setDemoState("rate_limited");
        return;
      }
      if (!res.ok) throw new Error(data.detail || "Translation failed");
      // Grab first block's english translation
      const translation = data.blocks?.[0]?.english_translation ?? "Translation complete.";
      setEnglishText(translation);
      setRemaining(data.remaining_demo_requests ?? null);
      setDemoState("success");
    } catch {
      setDemoState("idle");
    }
  }, [demoState]);

  // Switch language tab
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
    >
      {/* Noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="flex-1 flex flex-col items-center justify-center pt-24 pb-10 px-6">
        <div className="mx-auto max-w-4xl text-center w-full">

          {/* Eyebrow */}
          <div className="v1-eyebrow wispr-eyebrow text-neutral-500 opacity-0 mb-6 flex items-center justify-center gap-2">
            <span className="wispr-speaking-dot" />
            AI-Powered Code Comprehension
          </div>

          {/* Giant serif headline */}
          <h1
            className="wispr-headline text-neutral-900 mb-7"
            style={{ fontSize: "clamp(52px, 8vw, 96px)" }}
          >
            <span className="v1-word inline-block opacity-0">Every</span>{" "}
            <span className="v1-word inline-block opacity-0">Codebase</span>
            <br className="hidden sm:block" />
            <span className="v1-word inline-block opacity-0 italic" style={{ color: "#c8860a" }}>Has a Story.</span>
          </h1>

          {/* Sub */}
          <p className="v1-sub opacity-0 mx-auto mb-10 max-w-xl text-[17px] leading-relaxed text-neutral-500">
            The AI code translator that turns{" "}
            <span className="text-neutral-800 font-medium">obscure logic</span> into plain English — and back into production-ready code.
          </p>

          {/* CTAs */}
          <div className="v1-ctas opacity-0 flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <Link href="/signup" id="hero-try-btn" className="wispr-btn-primary">
              Try Anuvaad Free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#story" id="hero-story-btn" className="wispr-btn-secondary">
              See how it works
            </a>
          </div>

          {/* Trust strip */}
          <div className="v1-ctas opacity-0 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mb-12">
            {["Free forever", "No credit card required", "10 translations / day"].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-[12px] text-neutral-400">
                <svg className="h-3 w-3 text-amber-500 shrink-0" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </div>
            ))}
          </div>

          {/* Waveform visualizer */}
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

          {/* ── INTERACTIVE LIVE DEMO PANEL ── */}
          <div className="v1-demo opacity-0 mx-auto max-w-4xl">
            <div
              className="wispr-dark-section shadow-[0_24px_60px_rgba(0,0,0,0.25)] overflow-hidden"
              style={{ borderRadius: 32 }}
            >
              {/* Header — language tabs */}
              <div className="flex items-center justify-between border-b border-white/5 bg-black/30 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/50" />
                </div>

                {/* Language tab strip */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-1">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.key}
                      onClick={() => handleLangSwitch(lang)}
                      className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                        activeLang.key === lang.key
                          ? "border border-amber-500/40 bg-amber-500/10 text-amber-400"
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
                    className={`h-1.5 w-1.5 rounded-full ${demoState === "loading" ? "bg-amber-400 animate-pulse" : demoState === "success" ? "bg-green-400" : "bg-white/20"}`}
                  />
                  <span className="font-mono text-[10px] text-amber-400/60 uppercase tracking-widest hidden sm:block">
                    {demoState === "loading" ? "Translating..." : demoState === "success" ? "Complete" : "Code → English"}
                  </span>
                </div>
              </div>

              {/* Content — editable textarea + result */}
              <div className="grid md:grid-cols-2 min-h-[220px]">
                {/* Left — editable code input */}
                <div className="border-b border-white/5 bg-black/20 p-6 md:border-b-0 md:border-r md:border-white/5 flex flex-col">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
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

                {/* Right — translation output */}
                <div className="bg-transparent p-6 flex flex-col">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/50">
                    Plain English
                  </p>

                  {demoState === "rate_limited" ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-4">
                      <p className="text-sm text-neutral-400">You&apos;ve used all 3 demo translations today.</p>
                      <Link
                        href="/signup"
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-all"
                      >
                        Create free account — get 10/day <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : demoState === "loading" ? (
                    <div className="flex-1 flex flex-col gap-3 justify-center py-4">
                      {[100, 85, 70, 50].map((w, i) => (
                        <div key={i} className={`h-3 rounded-full bg-white/06 animate-pulse`} style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  ) : (
                    <p
                      className="flex-1 text-[15px] leading-relaxed text-slate-300 min-h-[150px] italic"
                      style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
                    >
                      {englishText || (
                        <span className="text-white/20 not-italic text-[13px]">
                          Translation will appear here. Hit the button or press Ctrl+Enter.
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer — translate button + remaining count */}
              <div className="border-t border-white/5 bg-black/30 px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => runTranslation(activeLang.key, code)}
                    disabled={demoState === "loading" || demoState === "rate_limited"}
                    className="flex items-center gap-2 rounded-full bg-amber-600 px-4 py-1.5 text-[11px] font-bold text-white hover:bg-amber-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {demoState === "loading" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Translate{" "}
                    <span className="hidden sm:inline text-amber-200/60 font-normal">· Ctrl+Enter</span>
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
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
        <span className="wispr-eyebrow text-neutral-400">Scroll</span>
        <div className="h-10 w-px bg-gradient-to-b from-neutral-400/60 to-transparent" />
      </div>
    </section>
  );
}
