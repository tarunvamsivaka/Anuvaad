"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".final-cta-reveal",
        { opacity: 0, y: 50, filter: "blur(6px)" },
        {
          opacity: 1, y: 0, filter: "blur(0px)",
          duration: 1.0, ease: "power4.out", stagger: 0.15,
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: "#f5f3ef" }}
    >
      {/* Top divider */}
      <div className="wispr-divider-light" />

      {/* Subtle warm radial */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 70%, rgba(200,134,10,0.04) 0%, transparent 65%)" }}
      />

      {/* Noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="mx-auto max-w-4xl px-6 py-40 text-center relative z-10">

        {/* Eyebrow */}
        <div className="final-cta-reveal opacity-0 mb-8 flex justify-center">
          <div className="wispr-eyebrow-pill-light">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Ready when you are
          </div>
        </div>

        {/* Giant headline — WisprFlow style */}
        <h2
          className="final-cta-reveal opacity-0 wispr-headline text-neutral-900 mb-6"
          style={{ fontSize: "clamp(52px, 8vw, 96px)" }}
        >
          Start Reading.<br />
          <span style={{ color: "#c8860a", fontStyle: "italic" }}>Any Codebase.</span>
        </h2>

        <p className="final-cta-reveal opacity-0 mx-auto mb-10 max-w-xl text-[18px] leading-relaxed text-neutral-500">
          Join thousands of developers turning cryptic repositories into readable documentation. Connect in under a minute.
        </p>

        {/* Feature checklist */}
        <div className="final-cta-reveal opacity-0 flex flex-wrap justify-center gap-x-8 gap-y-3 mb-12">
          {[
            "10 FREE translations / day",
            "35+ languages supported",
            "No credit card required",
            "Native Git integration",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-[13px] text-neutral-500">
              <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* CTAs — WisprFlow pill style */}
        <div className="final-cta-reveal opacity-0 flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link
            href="/signup"
            id="final-signup-btn"
            className="wispr-btn-primary"
          >
            Start for Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signin"
            id="final-signin-btn"
            className="wispr-btn-secondary"
          >
            Sign In
          </Link>
        </div>

        {/* Trust micro-copy */}
        <p className="final-cta-reveal opacity-0 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
          10 free translations per day · No code stored · Cancel anytime
        </p>

        {/* Decorative separator */}
        <div className="final-cta-reveal opacity-0 mt-24 flex items-center gap-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-300/30" />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-300"
            style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
          >
            Anuvaad
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-300/30" />
        </div>
      </div>
    </section>
  );
}
