"use client";

import React from "react";
import { SceneOrchestrator } from "./_orchestrator/SceneOrchestrator";
import { ReducedMotion, CustomCursor } from "@/components/motion";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

// Import landing specific CSS
import "@/design/css/landing.css";

export function LandingExperience() {
  return (
    <ReducedMotion>
      {/* Fluid custom cursor — auto-disabled on touch + prefers-reduced-motion */}
      <CustomCursor />

      <div className="relative min-h-screen w-full bg-transparent text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden">
        {/* Sticky Header Layer */}
        <Navbar />

        {/* Experiential Scroll-Driven Scenes */}
        <main className="flex-1 w-full relative z-10">
          <SceneOrchestrator />
        </main>

        {/* Global Footer Layer */}
        <Footer />
      </div>
    </ReducedMotion>
  );
}

export default LandingExperience;
