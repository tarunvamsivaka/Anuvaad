"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LenisContextValue {
  lenis: null; // Lenis removed; kept for API compatibility
  scrollProgress: number; // 0.0 → 1.0
  scrollY: number;
  velocity: number;
  activeSection: string;
  isReducedMotion: boolean;
  scrollTo: (
    target: string | HTMLElement | number,
    options?: Record<string, unknown>
  ) => void;
}

export interface LenisScrollProviderProps {
  children: React.ReactNode;
  onScrollUpdate?: (data: {
    progress: number;
    scrollY: number;
    velocity: number;
    activeSection: string;
  }) => void;
}

// ---------------------------------------------------------------------------
// Section IDs tracked for activeSection
// ---------------------------------------------------------------------------
const LANDING_SECTIONS = [
  "hero",
  "features",
  "pricing",
  "testimonials",
  "security",
  "git-pr",
  "faq",
];

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function LenisScrollProvider({
  children,
  onScrollUpdate,
}: LenisScrollProviderProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const activeSectionRef = useRef("hero");
  const lastScrollYRef = useRef(0);
  const lastTimestampRef = useRef(0);
  const onScrollUpdateRef = useRef(onScrollUpdate);

  useEffect(() => {
    onScrollUpdateRef.current = onScrollUpdate;
  }, [onScrollUpdate]);

  // ── Detect prefers-reduced-motion ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Native scroll listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    // Respect reduced-motion: disable smooth scroll behaviour
    if (isReducedMotion) {
      document.documentElement.style.scrollBehavior = "auto";
    }

    const handleScroll = () => {
      const currentY = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(currentY / maxScroll, 1) : 0;

      const now = performance.now();
      const dt = now - lastTimestampRef.current;
      const vel = dt > 0 ? (currentY - lastScrollYRef.current) / dt : 0;

      lastScrollYRef.current = currentY;
      lastTimestampRef.current = now;

      // Notify GSAP ScrollTrigger of manual scroll position
      ScrollTrigger.update();

      setScrollY(currentY);
      setScrollProgress(progress);
      setVelocity(vel);

      onScrollUpdateRef.current?.({
        progress,
        scrollY: currentY,
        velocity: vel,
        activeSection: activeSectionRef.current,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Fire once on mount so initial values are correct
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isReducedMotion]);

  // ── IntersectionObserver for active section tracking ───────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observers: IntersectionObserver[] = [];

    LANDING_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
              activeSectionRef.current = id;
            }
          });
        },
        {
          // A section becomes "active" when it occupies at least 30% of the viewport
          threshold: 0.3,
          rootMargin: "0px 0px -10% 0px",
        }
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  // ── ResizeObserver → ScrollTrigger.refresh() for layout reflows ────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ro = new ResizeObserver(() => {
      ScrollTrigger.refresh();
    });

    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  // ── scrollTo helper ────────────────────────────────────────────────────────
  const scrollTo = useCallback(
    (
      target: string | HTMLElement | number,
      options?: Record<string, unknown>
    ) => {
      const behavior: ScrollBehavior =
        isReducedMotion
          ? "auto"
          : ((options?.behavior as ScrollBehavior | undefined) ?? "smooth");

      if (typeof target === "string") {
        const id = target.startsWith("#") ? target.slice(1) : target;
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior });
      } else if (typeof target === "number") {
        window.scrollTo({ top: target, behavior });
      } else if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior });
      }
    },
    [isReducedMotion]
  );

  return (
    <LenisContext.Provider
      value={{
        lenis: null,
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
