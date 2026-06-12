"use client";

import React, { useRef } from "react";
import { SceneConfig, SceneProps } from "../_types";
import { useScrollProgress } from "../_hooks/useScrollProgress";
import { SceneWrapper } from "./SceneWrapper";

// Import all scene components
import { Scene01_RepositoryDiscovery } from "../_scenes/Scene01_RepositoryDiscovery";
import { Scene02_CodeConfusion } from "../_scenes/Scene02_CodeConfusion";
import { Scene03_Recognition } from "../_scenes/Scene03_Recognition";
import { Scene04_Understanding } from "../_scenes/Scene04_Understanding";
import { Scene05_RepositoryIntelligence } from "../_scenes/Scene05_RepositoryIntelligence";
import { Scene06_EnglishModification } from "../_scenes/Scene06_EnglishModification";
import { Scene07_CodeUpdates } from "../_scenes/Scene07_CodeUpdates";
import { Scene08_FutureVision } from "../_scenes/Scene08_FutureVision";
import { Scene09_FinalCTA } from "../_scenes/Scene09_FinalCTA";
import { WebGLCanvas } from "../_canvas/WebGLCanvas";

// Core Scene Configurations
const SCENE_CONFIGS: SceneConfig[] = [
  {
    id: "repository-discovery",
    title: "Repository Discovery",
    isPinned: false,
    scrollWeight: 1.0,
  },
  {
    id: "code-confusion",
    title: "Code Confusion",
    isPinned: true,
    scrollWeight: 2.0,
  },
  {
    id: "recognition",
    title: "Recognition",
    isPinned: true,
    scrollWeight: 1.5,
  },
  {
    id: "understanding",
    title: "Understanding",
    isPinned: true,
    scrollWeight: 2.0,
  },
  {
    id: "repository-intelligence",
    title: "Repository Intelligence",
    isPinned: true,
    scrollWeight: 1.5,
  },
  {
    id: "english-modification",
    title: "English Modification",
    isPinned: true,
    scrollWeight: 2.0,
  },
  {
    id: "code-updates",
    title: "Code Updates",
    isPinned: true,
    scrollWeight: 2.0,
  },
  {
    id: "future-vision",
    title: "Future Vision",
    isPinned: false,
    scrollWeight: 1.0,
  },
  {
    id: "final-cta",
    title: "Final CTA",
    isPinned: true,
    scrollWeight: 1.5,
  },
];

export function SceneOrchestrator() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Global progress tracking for the entire landing page experience
  const globalProgress = useScrollProgress({
    triggerRef: containerRef,
    start: "top top",
    end: "bottom bottom",
  });

  const renderScene = (config: SceneConfig, props: SceneProps) => {
    switch (config.id) {
      case "repository-discovery":
        return <Scene01_RepositoryDiscovery {...props} />;
      case "code-confusion":
        return <Scene02_CodeConfusion {...props} />;
      case "recognition":
        return <Scene03_Recognition {...props} />;
      case "understanding":
        return <Scene04_Understanding {...props} />;
      case "repository-intelligence":
        return <Scene05_RepositoryIntelligence {...props} />;
      case "english-modification":
        return <Scene06_EnglishModification {...props} />;
      case "code-updates":
        return <Scene07_CodeUpdates {...props} />;
      case "future-vision":
        return <Scene08_FutureVision {...props} />;
      case "final-cta":
        return <Scene09_FinalCTA {...props} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-transparent"
      style={{ minHeight: `${SCENE_CONFIGS.reduce((sum, s) => sum + s.scrollWeight, 0) * 100}vh` }}
    >
      {/* Background WebGL particle canvas */}
      <WebGLCanvas globalProgress={globalProgress} />
      {/* Universal Scroll Indicator */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-white/5 z-50 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.6)] transition-all duration-75"
          style={{ width: `${globalProgress * 100}%` }}
        />
      </div>

      {/* Map through scenes and render wrappers */}
      {SCENE_CONFIGS.map((config) => (
        <SceneWrapper
          key={config.id}
          config={config}
          globalProgress={globalProgress}
        >
          {(props) => renderScene(config, props)}
        </SceneWrapper>
      ))}
    </div>
  );
}
