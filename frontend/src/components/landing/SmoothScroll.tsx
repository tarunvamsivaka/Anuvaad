"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const sections = [
  { id: "hero", label: "INTRO" },
  { id: "story", label: "STORY" },
  { id: "features", label: "FEATURES" },
  { id: "how-it-works", label: "PROCESS" },
  { id: "pricing", label: "PRICING" },
  { id: "faq", label: "FAQ" },
];

export function SmoothScroll() {
  const [activeSection, setActiveSection] = useState("hero");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // ── 1. SMOOTH SCROLL INTEGRATION ──
    document.documentElement.style.scrollBehavior = "smooth";

    // ── 2. SCROLL TRIGGER PROGRESS ──
    const mainProgressTrigger = ScrollTrigger.create({
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        setProgress(self.progress * 100);
      },
    });

    // ── 3. ACTIVE SECTION HIGHLIGHTING ──
    const sectionTriggers = sections.map((sec) => {
      return ScrollTrigger.create({
        trigger: `#${sec.id}`,
        start: "top center",
        end: "bottom center",
        onEnter: () => setActiveSection(sec.id),
        onEnterBack: () => setActiveSection(sec.id),
      });
    });

    // ── 4. STAGGERED REVEALS FOR SECTIONS ──
    const elementsToReveal = document.querySelectorAll(".cinematic-reveal");
    elementsToReveal.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });

    return () => {
      document.documentElement.style.scrollBehavior = "auto";
      mainProgressTrigger.kill();
      sectionTriggers.forEach((t) => t.kill());
    };
  }, []);

  const handleNavClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Immersive Scroll Progress Tracker on the Right */}
      <div className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-6 md:flex">
        <div className="relative h-48 w-0.5 rounded-full bg-white/10">
          {/* Active Progress glow indicator */}
          <div
            className="absolute top-0 w-full rounded-full bg-gradient-to-b from-indigo-500 to-pink-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] transition-all duration-75"
            style={{ height: `${progress}%` }}
          />
        </div>

        {/* Section Dots */}
        <div className="flex flex-col gap-4">
          {sections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => handleNavClick(sec.id)}
                className="group relative flex h-4 w-4 items-center justify-center focus:outline-none"
                aria-label={`Scroll to ${sec.label}`}
              >
                {/* Outer Ring */}
                <span
                  className={`absolute h-3 w-3 rounded-full border border-indigo-500/60 transition-all duration-300 ${
                    isActive ? "scale-125 opacity-100" : "scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-60"
                  }`}
                />
                {/* Inner Dot */}
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                    isActive ? "bg-white" : "bg-white/40 group-hover:bg-white"
                  }`}
                />

                {/* Floating section text labels */}
                <span className="pointer-events-none absolute right-7 origin-right scale-70 rounded bg-[#0b0b1e] border border-white/5 px-2 py-1 text-[9px] font-bold tracking-widest text-indigo-400 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  {sec.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
