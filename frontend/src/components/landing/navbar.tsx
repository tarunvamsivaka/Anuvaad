"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import gsap from "gsap";
import { Logo } from "@/components/landing/Logo";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
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
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.1 }
    );

    // ── SCROLL DETECTOR ──
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 border-b",
        scrolled
          ? "bg-[#030014]/80 border-white/10 backdrop-blur-md py-2 shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
          : "bg-transparent border-transparent py-4"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="nav-item-reveal block opacity-0">
          <Logo />
        </Link>

        {/* Navigation links with slide and fade */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav-item-reveal text-xs font-semibold uppercase tracking-widest text-slate-400 transition-colors hover:text-white opacity-0"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Buttons with glassmorphism backgrounds */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link
            href="/signin"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "nav-item-reveal text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 opacity-0"
            )}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "sm" }),
              "nav-item-reveal gap-1.5 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300 opacity-0"
            )}
          >
            Start Free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            className="text-white focus:outline-none"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 border-b border-white/10 bg-[#030014]/95 px-6 pb-6 pt-4 backdrop-blur-lg md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold uppercase tracking-wider text-slate-400 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
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
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "flex-1 text-center text-xs font-bold uppercase bg-indigo-600"
                )}
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
