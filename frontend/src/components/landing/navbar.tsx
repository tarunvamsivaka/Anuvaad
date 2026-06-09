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
    gsap.fromTo(
      ".nav-item-reveal",
      { opacity: 0, y: -18 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, delay: 0.1 }
    );

    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-400",
        scrolled
          ? "bg-[#020204]/90 border-b border-amber-500/10 backdrop-blur-2xl py-2 shadow-[0_4px_40px_rgba(0,0,0,0.7)]"
          : "bg-transparent border-b border-transparent py-4"
      )}
    >
      {/* Amber gradient underline on scroll */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent transition-opacity duration-500",
          scrolled ? "opacity-100" : "opacity-0"
        )}
      />

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="nav-item-reveal block opacity-0">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav-item-reveal group relative text-[11px] font-semibold uppercase tracking-widest text-slate-400 transition-colors hover:text-white opacity-0"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300 group-hover:w-full rounded-full" />
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/signin"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "nav-item-reveal text-[11px] font-semibold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/6 opacity-0 transition-all duration-300 rounded-lg"
            )}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="nav-item-reveal opacity-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider btn-amber-shimmer transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
          >
            Start Free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all md:hidden"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "absolute top-full left-0 right-0 border-b border-amber-500/10 bg-[#020204]/97 px-6 backdrop-blur-2xl md:hidden transition-all duration-300 overflow-hidden",
          mobileOpen ? "max-h-96 pb-6 pt-4 opacity-100" : "max-h-0 pb-0 pt-0 opacity-0"
        )}
      >
        <nav className="flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold uppercase tracking-wider text-slate-400 hover:text-amber-400 transition-colors animated-underline"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-4 border-t border-white/5">
            <Link
              href="/signin"
              className="flex-1 text-center text-xs font-semibold py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-all"
              onClick={() => setMobileOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl btn-amber-shimmer"
              onClick={() => setMobileOpen(false)}
            >
              Start Free
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
