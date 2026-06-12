"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const sections = [
  { id: "hero", label: "INTRO" },
  { id: "story", label: "STORY" },
  { id: "demo", label: "DEMO" },
  { id: "features", label: "FEATURES" },
  { id: "faq", label: "FAQ" },
];

export function SmoothScroll() {
  const [activeSection, setActiveSection] = useState("hero");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    document.documentElement.style.scrollBehavior = "smooth";

    // Global page progress
    const mainProgressTrigger = ScrollTrigger.create({
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        setProgress(self.progress * 100);
      },
    });

    // Active section tracking
    const sectionTriggers = sections.map((sec) => {
      return ScrollTrigger.create({
        trigger: `#${sec.id}`,
        start: "top center",
        end: "bottom center",
        onEnter: () => setActiveSection(sec.id),
        onEnterBack: () => setActiveSection(sec.id),
      });
    });

    // Cinematic reveal for `.cinematic-reveal` elements
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
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Amber Scroll Progress Tracker — right side */}
      <nav 
        aria-label="Page navigation"
        className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-6 md:flex"
      >
        {/* Progress bar */}
        <div className="relative h-48 w-0.5 rounded-full bg-white/10">
          <div
            className="absolute top-0 w-full rounded-full bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.8)] transition-all duration-75"
            style={{ height: `${progress}%` }}
          />
        </div>

        {/* Section dots */}
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
                {/* Outer ring */}
                <span
                  className={`absolute h-3 w-3 rounded-full border border-amber-500/60 transition-all duration-300 ${
                    isActive ? "scale-125 opacity-100" : "scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-60"
                  }`}
                />
                {/* Inner dot */}
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                    isActive ? "bg-amber-400" : "bg-white/40 group-hover:bg-white"
                  }`}
                />
                {/* Floating label */}
                <span className="pointer-events-none absolute right-7 origin-right scale-70 rounded bg-[#0a0a0e] border border-amber-500/10 px-2 py-1 text-[9px] font-bold tracking-widest text-amber-400 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 shadow-[0_4px_12px_rgba(0,0,0,0.6)] whitespace-nowrap">
                  {sec.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
