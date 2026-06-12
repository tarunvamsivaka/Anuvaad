"use client";

/**
 * ARCH-03: Thin barrel wrapper for V1 landing page components.
 * Allows page.tsx to use dynamic() import without having to
 * import all V1 components at the module root level.
 * Only bundled when NEXT_PUBLIC_LANDING_V2 !== "true".
 */

import React from "react";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { TransformationDemo } from "@/components/landing/TransformationDemo";
import { Features } from "@/components/landing/features";
import { Positioning } from "@/components/landing/Positioning";
import { Trust } from "@/components/landing/Trust";
import { Testimonials } from "@/components/landing/testimonials";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { WebGLScrollProvider } from "@/components/landing/WebGLScrollProvider";

export default function LandingV1Page() {
  return (
    <>
      {/* 3D WebGL particle background (loaded client-side) */}
      <WebGLScrollProvider />

      {/* Smooth scroll side-nav tracker */}
      <SmoothScroll />

      {/* The full landing page */}
      <div
        className="relative z-10 flex min-h-screen flex-col text-slate-100 selection:bg-amber-500/30 selection:text-amber-200"
        style={{ background: "var(--landing-bg, #020204)" }}
      >
        <Navbar />

        <main className="flex-1">
          <div id="hero">
            <Hero />
          </div>

          <div id="story">
            <ScrollStory />
          </div>

          <div id="demo">
            <TransformationDemo />
          </div>

          <div id="features">
            <Features />
          </div>

          <Positioning />
          <Trust />
          <Testimonials />

          <div id="faq">
            <FAQ />
          </div>

          <div id="cta">
            <FinalCTA />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
