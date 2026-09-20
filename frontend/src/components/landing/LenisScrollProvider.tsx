"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionSafe } from "@/lib/motion";
import "lenis/dist/lenis.css";

export interface LenisContextValue {
  lenis: Lenis | null;
  scrollProgress: number; // 0.0 to 1.0
  scrollY: number;
  velocity: number;
  activeSection: string;
  isReducedMotion: boolean;
  scrollTo: (target: string | HTMLElement | number, options?: Record<string, unknown>) => void;
}

const LenisContext = createContext<LenisContextValue>({
  lenis: null,
  scrollProgress: 0,
  scrollY: 0,
  velocity: 0,
  activeSection: "hero",
  isReducedMotion: false,
  scrollTo: () => {},
});

export const useLenis = () => useContext(LenisContext);

const LANDING_SECTIONS = [
  "hero",
  "features",
  "positioning",
  "trust",
  "testimonials",
  "faq",
  "stats",
  "footer",
];

interface LenisScrollProviderProps {
  children: React.ReactNode;
  onScrollUpdate?: (data: { progress: number; scrollY: number; velocity: number; activeSection: string }) => void;
}

export function LenisScrollProvider({ children, onScrollUpdate }: LenisScrollProviderProps) {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");

  const motionSafe = useMotionSafe();
  const isReducedMotion = !motionSafe;
  const activeSectionRef = useRef("hero");

  useEffect(() => {
    // If reduced motion is requested, do not initialize Lenis smooth scroll driver
    if (isReducedMotion) {
      document.documentElement.style.scrollBehavior = "auto";
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis driver
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease-out
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
      infinite: false,
    });

    setLenisInstance(lenis);

    // 1. Sync Lenis scroll events with GSAP ScrollTrigger
    lenis.on("scroll", (e: { progress: number; scroll: number; velocity: number }) => {
      ScrollTrigger.update();
      setScrollProgress(e.progress);
      setScrollY(e.scroll);
      setVelocity(e.velocity);

      if (onScrollUpdate) {
        onScrollUpdate({
          progress: e.progress,
          scrollY: e.scroll,
          velocity: e.velocity,
          activeSection: activeSectionRef.current,
        });
      }
    });

    // 2. Add Lenis RAF loop to GSAP Ticker
    // IMPORTANT: GSAP Ticker supplies time in SECONDS. Lenis.raf requires MILLISECONDS.
    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0); // Disable GSAP lag smoothing to maintain tight WebGL sync

    // 3. Register ScrollTriggers to observe active section entry
    const sectionTriggers: ScrollTrigger[] = [];
    LANDING_SECTIONS.forEach((sectionId) => {
      const el = document.getElementById(sectionId);
      if (el) {
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: "top 60%",
          end: "bottom 40%",
          onEnter: () => {
            setActiveSection(sectionId);
            activeSectionRef.current = sectionId;
          },
          onEnterBack: () => {
            setActiveSection(sectionId);
            activeSectionRef.current = sectionId;
          },
        });
        sectionTriggers.push(trigger);
      }
    });

    // Cleanup on unmount (or React 19 double-effect execution)
    return () => {
      gsap.ticker.remove(tickerCallback);
      sectionTriggers.forEach((st) => st.kill());
      lenis.destroy();
      setLenisInstance(null);
    };
  }, [isReducedMotion, onScrollUpdate]);

  const scrollTo = useCallback(
    (target: string | HTMLElement | number, options?: Record<string, unknown>) => {
      if (lenisInstance) {
        lenisInstance.scrollTo(target, { duration: 1.2, ...options });
      } else {
        // Fallback for reduced-motion or uninitialized state
        if (typeof target === "string") {
          const el = document.getElementById(target.replace("#", ""));
          el?.scrollIntoView({ behavior: "smooth" });
        } else if (typeof target === "number") {
          window.scrollTo({ top: target, behavior: "smooth" });
        } else if (target instanceof HTMLElement) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    [lenisInstance]
  );

  return (
    <LenisContext.Provider
      value={{
        lenis: lenisInstance,
        scrollProgress,
        scrollY,
        velocity,
        activeSection,
        isReducedMotion,
        scrollTo,
      }}
    >
      {children}
    </LenisContext.Provider>
  );
}

export default LenisScrollProvider;
