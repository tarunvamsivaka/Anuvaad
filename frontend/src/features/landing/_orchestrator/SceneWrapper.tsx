"use client";

import React, { useRef, useState, useEffect } from "react";
import { registerScrollTrigger } from "@/lib/motion";
import { SceneConfig, SceneProps } from "../_types";

interface SceneWrapperProps {
  config: SceneConfig;
  globalProgress: number;
  children: (props: SceneProps) => React.ReactNode;
}

export function SceneWrapper({ config, globalProgress, children }: SceneWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let triggerInstance: any = null;

    if (!containerRef.current) return;

    registerScrollTrigger().then(({ ScrollTrigger }) => {
      if (!containerRef.current) return;

      triggerInstance = ScrollTrigger.create({
        trigger: containerRef.current,
        start: config.isPinned ? "top top" : "top bottom",
        end: config.isPinned ? "bottom bottom" : "bottom top",
        pin: config.isPinned ? pinRef.current ?? undefined : undefined,
        scrub: true,
        onToggle: (self) => {
          setActive(self.isActive);
        },
        onUpdate: (self) => {
          setProgress(self.progress);
        },
      });
    });

    return () => {
      if (triggerInstance) {
        triggerInstance.kill();
      }
    };
  }, [config]);

  // Style height based on scroll weight (e.g. weight of 1 = 100vh)
  const heightStyle = {
    height: `${config.scrollWeight * 100}vh`,
  };

  return (
    <div
      ref={containerRef}
      style={heightStyle}
      className="relative w-full"
      data-scene-id={config.id}
    >
      <div
        ref={pinRef}
        className="w-full h-screen relative overflow-hidden"
      >
        {children({
          id: config.id,
          active,
          progress,
          globalProgress,
        })}
      </div>
    </div>
  );
}
