"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WisprNavbarProps {
  onSignIn?: () => void;
  onGetStarted?: () => void;
  className?: string;
}

export const NAV_LINKS = [
  { label: "Workbench", href: "#workbench" },
  { label: "Git/PR Demo", href: "#git-pr" },
  { label: "Benchmarks", href: "#benchmarks" },
  { label: "Security", href: "#security" },
  { label: "Testimonials", href: "#proof" },
];

// Section IDs to track for active link highlighting
const SECTION_IDS = ["workbench", "git-pr", "benchmarks", "security", "proof"];

export function WisprNavbar({
  onSignIn,
  onGetStarted,
  className,
}: WisprNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll → glass intensity
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    const options: IntersectionObserverInit = {
      rootMargin: "-30% 0px -60% 0px",
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, options);

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  // Close mobile menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 w-full px-4 pt-3.5 sm:pt-4 pointer-events-none"
      role="banner"
    >
      <div
        className={cn(
          "mx-auto max-w-5xl h-14 px-4 sm:px-6 rounded-full pointer-events-auto flex items-center justify-between transition-all duration-300",
          isScrolled
            ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-300/80 dark:border-slate-700/80 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)]"
            : "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
          className
        )}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
          aria-label="Anuvaad Home"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-sm shadow-sm group-hover:scale-110 group-hover:rotate-[5deg] transition-transform duration-300 will-change-transform">
            A
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
            Anuvaad
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            v2.0
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1 lg:gap-2"
          aria-label="Main Navigation"
          role="navigation"
        >
          {NAV_LINKS.map((item) => {
            const sectionId = item.href.replace("#", "");
            const isActive = activeSection === sectionId;
            return (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  "relative px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                  isActive
                    ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                )}
              >
                {item.label}
                {/* Active underline indicator */}
                <span
                  className={cn(
                    "absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full bg-amber-500 origin-center transition-transform duration-300",
                    isActive ? "scale-x-100" : "scale-x-0"
                  )}
                />
              </a>
            );
          })}
        </nav>

        {/* Desktop CTA Controls */}
        <div className="hidden md:flex items-center gap-2.5">
          {onSignIn ? (
            <button
              onClick={onSignIn}
              type="button"
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Sign In
            </button>
          ) : (
            <Link
              href="/signin"
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Sign In
            </Link>
          )}

          {onGetStarted ? (
            <button
              onClick={onGetStarted}
              type="button"
              className="group inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-amber-500 dark:hover:bg-amber-500 dark:hover:text-white hover:scale-[1.04] active:scale-[0.97] transition-all duration-200 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <Link
              href="/signup"
              className="group inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-amber-500 dark:hover:bg-amber-500 dark:hover:text-white hover:scale-[1.04] active:scale-[0.97] transition-all duration-200 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="wispr-mobile-menu"
          type="button"
          className="md:hidden flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {/* Animated hamburger → X */}
          <div className="relative w-4 h-4">
            <Menu
              className={cn(
                "absolute inset-0 h-4 w-4 transition-all duration-200",
                mobileOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
              )}
            />
            <X
              className={cn(
                "absolute inset-0 h-4 w-4 transition-all duration-200",
                mobileOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
              )}
            />
          </div>
        </button>
      </div>

      {/* Mobile Drawer — uses CSS grid trick for smooth height animation */}
      <div
        id="wispr-mobile-menu"
        className={cn(
          "md:hidden mt-2 mx-auto max-w-5xl rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl pointer-events-auto overflow-hidden transition-all duration-300 ease-out",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{
          display: "grid",
          gridTemplateRows: mobileOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s ease-out, opacity 0.25s ease",
        }}
        aria-hidden={!mobileOpen}
      >
        <div className="overflow-hidden">
          <nav className="flex flex-col gap-2 p-5" aria-label="Mobile Navigation">
            {NAV_LINKS.map((item) => {
              const sectionId = item.href.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "text-sm font-medium py-2 px-3 rounded-lg transition-all",
                    isActive
                      ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"
                      : "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {item.label}
                </a>
              );
            })}
            <div className="flex gap-2.5 pt-3 mt-2 border-t border-slate-200 dark:border-slate-800">
              {onSignIn ? (
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); onSignIn(); }}
                  className="flex-1 text-center text-xs font-medium py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </button>
              ) : (
                <Link
                  href="/signin"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center text-xs font-medium py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </Link>
              )}

              {onGetStarted ? (
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); onGetStarted(); }}
                  className="flex-1 text-center text-xs font-bold py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                >
                  Get Started
                </button>
              ) : (
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center text-xs font-bold py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                >
                  Get Started
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default WisprNavbar;
