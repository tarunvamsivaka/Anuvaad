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
    gsap.fromTo(
      ".nav-item-reveal",
      { opacity: 0, y: -14 },
      { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.07, delay: 0.15 }
    );

    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 32);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full">
      {/* ── FLOATING PILL WRAPPER ─────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div
          className={cn(
            "flex items-center justify-between h-14 px-5 transition-all duration-400",
            cn("wispr-nav-pill", scrolled && "scrolled")
          )}
        >
          {/* Logo */}
          <Link href="/" className="nav-item-reveal block opacity-0 shrink-0">
            <Logo theme="light" />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-item-reveal group relative text-[12px] font-medium transition-colors duration-200 opacity-0 text-neutral-500 hover:text-neutral-900"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 transition-all duration-250 group-hover:w-full rounded-full bg-[#034f46]" />
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2.5 md:flex shrink-0">
            <Link
              href="/signin"
              className="nav-item-reveal opacity-0 text-[12px] font-medium transition-colors px-3 py-1.5 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="nav-item-reveal opacity-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 bg-amber-600 text-white hover:bg-amber-500 shadow-[0_2px_12px_rgba(200,134,10,0.25)] hover:shadow-[0_4px_20px_rgba(200,134,10,0.40)] hover:scale-[1.02]"
            >
              Get Started <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="flex items-center justify-center h-8 w-8 rounded-full transition-all md:hidden bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* ── MOBILE DRAWER ──────────────────────────────────── */}
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
            <div className="flex gap-2.5 pt-3 border-t border-neutral-100">
              <Link
                href="/signin"
                className="flex-1 text-center text-xs font-medium py-2.5 rounded-full border transition-all border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="flex-1 text-center text-xs font-semibold py-2.5 rounded-full transition-all bg-amber-600 text-white hover:bg-amber-500"
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
