"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/landing/Logo";
import gsap from "gsap";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Story", href: "#story" },
  { label: "Demo", href: "#demo" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // ── NAVBAR ENTRANCE ANIMATION ──
    gsap.fromTo(
      ".nav-item-reveal",
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }
    );

    // ── SCROLL DETECTOR ──
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "bg-[#020204]/85 border-b border-amber-500/10 backdrop-blur-xl py-2 shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
          : "bg-transparent border-b border-transparent py-4"
      )}
    >
      {/* Amber bottom line glow on scroll */}
      {scrolled && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      )}

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="nav-item-reveal block opacity-0">
          <Logo />
        </Link>

        {/* Navigation links */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav-item-reveal group relative text-[11px] font-semibold uppercase tracking-widest text-slate-400 transition-colors hover:text-white opacity-0"
            >
              {link.label}
              {/* Amber underline on hover */}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/signin"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "nav-item-reveal text-[11px] font-semibold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 opacity-0 transition-all duration-300"
            )}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="nav-item-reveal opacity-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider btn-amber-shimmer transition-all duration-300 hover:scale-105"
          >
            Start Free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            className="text-white focus:outline-none p-1"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 border-b border-amber-500/10 bg-[#020204]/95 px-6 pb-6 pt-4 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold uppercase tracking-wider text-slate-400 hover:text-amber-400 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 pt-3 border-t border-white/5">
              <Link
                href="/signin"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "flex-1 text-center text-xs font-semibold uppercase border-white/15 bg-transparent text-slate-300"
                )}
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="flex-1 text-center inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider btn-amber-shimmer"
                onClick={() => setMobileOpen(false)}
              >
                Start Free
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
