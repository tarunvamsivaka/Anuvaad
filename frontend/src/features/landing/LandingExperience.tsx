"use client";

import React from "react";
import dynamic from "next/dynamic";
import { SceneOrchestrator } from "./_orchestrator/SceneOrchestrator";
import { ReducedMotion, CustomCursor } from "@/components/motion";
import { LenisScrollProvider } from "@/components/landing/LenisScrollProvider";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { LogoMarquee } from "./_components/LogoMarquee";
import { MouseOrb } from "./_components/MouseOrb";
import { LiveActivityFeed } from "./_components/LiveActivityFeed";

// Import landing static sections
import { Features } from "@/components/landing/features";
import { Positioning } from "@/components/landing/Positioning";
import { Trust } from "@/components/landing/Trust";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { StatsBanner } from "@/components/landing/StatsBanner";
import { ExitIntentModal } from "@/components/landing/ExitIntentModal";

// 2D Flat Minimalism Fallback for Reduced Motion
const LandingV1Page = dynamic(() => import("@/components/landing/LandingV1Page"), {
  ssr: false,
});

// Import landing specific CSS
import "@/design/css/landing.css";

export function LandingExperience() {
  return (
    <ReducedMotion fallback={<LandingV1Page />}>
      <LenisScrollProvider>
        <CustomCursor />
        <MouseOrb />
        <LiveActivityFeed />

        <div className="relative min-h-screen w-full bg-[#f5f3ef] text-neutral-900 flex flex-col selection:bg-amber-500/30 selection:text-amber-900 overflow-x-hidden">
          {/* Floating Pill Navbar */}
          <Navbar />

          {/* Experiential Scroll-Driven Scenes */}
          <main className="flex-1 w-full relative z-10">
            <SceneOrchestrator />

            {/* Static Marketing Sections */}
            <div id="features">
              <StatsBanner />
              <Features />
            </div>

            <Positioning />
            <Trust />
            <Testimonials />

            <div id="faq">
              <FAQ />
            </div>
          </main>

          {/* Logo Marquee — between scroll experience and footer */}
          <LogoMarquee />

          {/* Global Footer Layer with 3D Scroll Elevation */}
          <Footer />
        </div>
        <ExitIntentModal />
      </LenisScrollProvider>
    </ReducedMotion>
  );
}

export default LandingExperience;
