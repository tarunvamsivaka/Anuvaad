"use client";

import React, { useState, useEffect } from "react";
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

export function WisprNavbar({
  onSignIn,
  onGetStarted,
  className,
}: WisprNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
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
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-3 py-1.5 rounded-full text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {item.label}
            </a>
          ))}
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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
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
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <div
        id="wispr-mobile-menu"
        className={cn(
          "md:hidden mt-2 mx-auto max-w-5xl rounded-2xl overflow-hidden transition-all duration-300 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl pointer-events-auto",
          mobileOpen
            ? "max-h-96 opacity-100 p-5"
            : "max-h-0 opacity-0 p-0 border-transparent pointer-events-none"
        )}
      >
        <nav className="flex flex-col gap-2" aria-label="Mobile Navigation">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium py-2 px-3 rounded-lg text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {item.label}
            </a>
          ))}
          <div className="flex gap-2.5 pt-3 mt-2 border-t border-slate-200 dark:border-slate-800">
            {onSignIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onSignIn();
                }}
                className="flex-1 text-center text-xs font-medium py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                Sign In
              </button>
            ) : (
              <Link
                href="/signin"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center text-xs font-medium py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                Sign In
              </Link>
            )}

            {onGetStarted ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onGetStarted();
                }}
                className="flex-1 text-center text-xs font-semibold py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              >
                Get Started
              </button>
            ) : (
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center text-xs font-semibold py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              >
                Get Started
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default WisprNavbar;
