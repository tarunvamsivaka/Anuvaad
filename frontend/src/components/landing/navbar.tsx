"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/landing/Logo";
import gsap from "gsap";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Story",    href: "#story"    },
  { label: "Demo",     href: "#demo"     },
  { label: "FAQ",      href: "#faq"      },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);

  useEffect(() => {
    // Motion: staggered entrance — Modern Sans nav items
    gsap.fromTo(
      ".nav-item-reveal",
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.07, delay: 0.15 }
    );

    const handleScroll = () => {
      setScrolled(window.scrollY > 32);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full">
      {/* ── FLOATING PILL — Organic Curve + Ink Border ─────────── */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div
          className={cn(
            "flex items-center justify-between h-14 px-5 transition-all duration-300",
            cn("wispr-nav-pill", scrolled && "scrolled")
          )}
        >
          {/* Logo */}
          <Link href="/" className="nav-item-reveal block opacity-0 shrink-0">
            <Logo theme="light" />
          </Link>

          {/* Desktop nav links — Modern Sans */}
          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-item-reveal group relative text-[12px] font-medium tracking-wide transition-colors duration-200 opacity-0 text-neutral-500 hover:text-neutral-900"
                style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
              >
                {link.label}
                {/* Ink underline on hover — flat minimalism */}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 transition-all duration-250 group-hover:w-full rounded-full bg-[#034f46]" />
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2.5 md:flex shrink-0">
            <Link
              href="/signin"
              className="nav-item-reveal opacity-0 text-[12px] font-medium tracking-wide transition-colors px-3 py-1.5 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-black/05"
              style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
            >
              Sign in
            </Link>
            {/* Primary CTA — Amber + pill radius (Organic Curve) */}
            <Link
              href="/signup"
              className="nav-item-reveal opacity-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 bg-[#c8860a] text-white hover:bg-[#b07308] hover:scale-[1.02]"
              style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
            >
              Get Started <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="flex items-center justify-center h-8 w-8 rounded-full transition-all md:hidden border border-[rgba(26,18,8,0.12)] bg-white text-neutral-600 hover:bg-neutral-50"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* ── MOBILE DRAWER — flat, ink border ─────────────────── */}
        <div
          className={cn(
            "mt-2 overflow-hidden transition-all duration-300",
            "wispr-nav-pill",
            mobileOpen ? "max-h-72 opacity-100 px-5 py-4" : "max-h-0 opacity-0 px-5 py-0"
          )}
        >
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-colors py-1 text-neutral-600 hover:text-neutral-900"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {/* Ink border divider */}
            <div className="flex gap-2.5 pt-3 border-t border-[rgba(26,18,8,0.08)]">
              <Link
                href="/signin"
                className="flex-1 text-center text-xs font-medium py-2.5 rounded-full border border-[rgba(26,18,8,0.12)] text-neutral-600 hover:bg-neutral-50 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="flex-1 text-center text-xs font-semibold py-2.5 rounded-full transition-all bg-[#c8860a] text-white hover:bg-[#b07308]"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
