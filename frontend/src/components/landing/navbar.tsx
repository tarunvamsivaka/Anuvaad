"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight">Anuvaad</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-600">Translator</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link href="/signin" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Sign In</Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>Start Free <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/40 bg-background px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>{link.label}</a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/signin" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 text-center")}>Sign In</Link>
              <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "flex-1 text-center")}>Start Free</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
