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
import { LogoMarquee } from "@/features/landing/_components/LogoMarquee";
import { MouseOrb } from "@/features/landing/_components/MouseOrb";
import { LiveActivityFeed } from "@/features/landing/_components/LiveActivityFeed";
import { StatsBanner } from "@/components/landing/StatsBanner";
import { ExitIntentModal } from "@/components/landing/ExitIntentModal";

export default function LandingV1Page() {
  return (
    <>
      {/* 3D WebGL particle background (loaded client-side) */}
      <WebGLScrollProvider />

      {/* Smooth scroll side-nav tracker */}
      <SmoothScroll />

      {/* Ambient cursor glow */}
      <MouseOrb />

      {/* Live activity feed toast */}
      <LiveActivityFeed />

      {/* Exit-intent email capture overlay */}
      <ExitIntentModal />

      {/* The full landing page */}
      <div
        className="relative z-10 flex min-h-screen flex-col selection:bg-amber-500/30"
        style={{ background: "#f5f3ef" }}
      >
        <Navbar />

        <main className="flex-1">
          <div id="hero">
            <Hero />
          </div>

          {/* Stats strip — immediately after hero for max conversion impact */}
          <StatsBanner />

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
          <LogoMarquee />
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
