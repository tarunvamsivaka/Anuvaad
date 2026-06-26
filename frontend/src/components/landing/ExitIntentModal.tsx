"use client";

import { useState, useEffect, useRef } from "react";
import { X, ArrowRight, Zap } from "lucide-react";
import gsap from "gsap";

const SESSION_KEY = "anuvaad_exit_intent_shown";

export function ExitIntentModal() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Detect exit intent — cursor approaching browser top bar
  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 15) {
        setVisible(true);
        sessionStorage.setItem(SESSION_KEY, "1");
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    };

    // Delay registration so it doesn't fire immediately on load
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Animate in
  useEffect(() => {
    if (!visible || !overlayRef.current || !panelRef.current) return;
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(
      panelRef.current,
      { opacity: 0, scale: 0.92, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.4)" }
    );
  }, [visible]);

  const close = () => {
    if (!overlayRef.current || !panelRef.current) { setVisible(false); return; }
    gsap.to(panelRef.current, { opacity: 0, scale: 0.95, y: 10, duration: 0.2 });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, onComplete: () => setVisible(false) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "exit_intent" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.28)]"
        style={{ background: "linear-gradient(145deg, #1a1611 0%, #0f0d0a 100%)" }}
      >
        {/* Amber glow accent */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #c8860a, transparent 70%)" }}
        />

        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-neutral-500 hover:text-white hover:border-white/20 transition-all"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-8 py-10">
          {status !== "success" ? (
            <>
              {/* Eyebrow */}
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/25">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                  Wait — one quick thing
                </span>
              </div>

              <h2
                className="mb-2 text-2xl font-bold leading-snug text-white"
                style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
              >
                Try Anuvaad free — 10 translations a day
              </h2>
              <p className="mb-6 text-sm text-neutral-400 leading-relaxed">
                Drop your email and we&apos;ll keep you updated on new features. Start translating free — 10 uses a day, no credit card ever.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/06 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
                {errorMsg && (
                  <p className="text-xs text-red-400">{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-500 transition-all duration-200 disabled:opacity-60"
                >
                  {status === "loading" ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      Claim my bonus <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-[10px] text-neutral-600">
                No credit card · Unsubscribe anytime
              </p>
            </>
          ) : (
            /* Success state */
            <div className="py-6 text-center">
              <div className="mb-5 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                  <svg className="h-8 w-8 text-amber-400" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <h3
                className="mb-2 text-xl font-bold text-white"
                style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
              >
                You&apos;re in!
              </h3>
              <p className="mb-6 text-sm text-neutral-400">
                You&apos;re set! Start with 10 free translations today — no credit card, no account needed.
              </p>
              <a
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-500 transition-all"
              >
                Try Anuvaad Free <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
