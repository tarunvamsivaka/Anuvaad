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
    let isMounted = true;
    let triggerInstance: any = null;

    if (!containerRef.current) return;

    registerScrollTrigger().then(({ ScrollTrigger }) => {
      if (!isMounted || !containerRef.current) return;

      triggerInstance = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top bottom",
        end: "bottom top",
        pin: undefined,
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
      isMounted = false;
      if (triggerInstance) {
        triggerInstance.kill();
      }
    };
  }, [config]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      data-scene-id={config.id}
    >
      <div
        ref={pinRef}
        className="w-full h-screen relative overflow-hidden bg-transparent"
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
