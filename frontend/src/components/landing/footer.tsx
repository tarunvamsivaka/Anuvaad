"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Logo } from "@/components/landing/Logo";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Demo", href: "#demo" },
    { label: "FAQ", href: "#faq" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Resources: [
    { label: "GitHub", href: "https://github.com/tarunvamsivaka/Anuvaad", external: true },
    { label: "API Docs", href: "https://github.com/tarunvamsivaka/Anuvaad#api-endpoints", external: true },
    { label: "Changelog", href: "https://github.com/tarunvamsivaka/Anuvaad/blob/main/CHANGELOG.md", external: true },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const STATUS_SERVICES = [
  { label: "API", ok: true },
  { label: "Auth", ok: true },
  { label: "AI Engine", ok: true },
];

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.fromTo(
          ".footer-content-reveal",
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: footerRef.current,
              start: "top 90%",
            },
          }
        );
        return;
      }

      // 3D Elevation / Rise Entrance
      gsap.fromTo(
        contentRef.current,
        {
          opacity: 0,
          y: 70,
          z: -80,
          rotateX: 14,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          z: 0,
          rotateX: 0,
          scale: 1,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 85%",
          },
        }
      );

      // Staggered column elevation
      gsap.fromTo(
        ".footer-col-3d",
        { opacity: 0, y: 25, z: -30, rotateX: 8 },
        {
          opacity: 1,
          y: 0,
          z: 0,
          rotateX: 0,
          duration: 0.75,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 80%",
          },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      id="footer"
      ref={footerRef}
      className="relative overflow-hidden"
      style={{
        background: "#0e1117",
        perspective: "1200px",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Ink border at top — replaces gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px z-20"
        style={{ background: "rgba(255, 255, 255, 0.08)" }}
      />

      {/* Subtle warm glow — Deep Dark Room ambient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 30% at 50% 0%, rgba(200,134,10,0.06) 0%, transparent 60%)",
        }}
      />

      {/* 3D Elevated Content Container */}
      <div
        ref={contentRef}
        className="footer-content-reveal mx-auto max-w-6xl px-6 py-16 relative z-10"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column — spans 2 */}
          <div className="footer-col-3d lg:col-span-2" style={{ transformStyle: "preserve-3d" }}>
            <Link href="/" className="block w-fit">
              <Logo theme="dark" />
            </Link>
            {/* Modern Sans body */}
            <p
              className="mt-4 text-sm leading-relaxed max-w-xs"
              style={{ color: "#6b5e4a", fontFamily: "var(--font-sans, Inter, sans-serif)" }}
            >
              AI-powered code translation for developers, students, and teams.
              Understand any codebase in minutes, not weeks.
            </p>

            {/* Social links — Organic Curve icon buttons */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://github.com/tarunvamsivaka/Anuvaad"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.09)",
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "#6b5e4a",
                }}
                aria-label="GitHub Repository"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#e8a830";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,134,10,0.30)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#6b5e4a";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.09)";
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>

            {/* Status indicator — flat dark, ink border */}
            <div
              className="mt-6 flex items-center gap-2 rounded-xl px-3 py-2.5 w-fit"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span
                  className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest"
                  style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
                >
                  All Systems Operational
                </span>
              </div>
              {/* Ink border divider */}
              <div
                className="flex items-center gap-2 pl-2"
                style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
              >
                {STATUS_SERVICES.map((s) => (
                  <span
                    key={s.label}
                    className="text-[9px] font-medium"
                    style={{ color: "#4a3e2e", fontFamily: "var(--font-sans, Inter, sans-serif)" }}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Link columns — Modern Sans */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="footer-col-3d" style={{ transformStyle: "preserve-3d" }}>
              <h4
                className="text-[10px] font-bold uppercase tracking-[0.2em] mb-5"
                style={{ color: "#4a3e2e", fontFamily: "var(--font-sans, Inter, sans-serif)" }}
              >
                {category}
              </h4>
              <ul className="space-y-3.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm transition-colors duration-200 inline-block"
                        style={{ color: "#6b5e4a", fontFamily: "var(--font-sans, Inter, sans-serif)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#e8a830")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b5e4a")}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm transition-colors duration-200 inline-block"
                        style={{ color: "#6b5e4a", fontFamily: "var(--font-sans, Inter, sans-serif)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#e8a830")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b5e4a")}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Ink border divider */}
        <div className="my-10 wispr-divider-dark" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs" style={{ color: "#4a3e2e", fontFamily: "var(--font-sans, Inter, sans-serif)" }}>
            © {new Date().getFullYear()} Anuvaad. All rights reserved. · Made in India 🇮🇳
          </p>
          {/* Editorial Serif tagline */}
          <p
            className="text-xs font-medium"
            style={{
              color: "#6b5e4a",
              fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))",
              fontStyle: "italic",
            }}
          >
            Built with ♥ for developers who care about understanding.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
