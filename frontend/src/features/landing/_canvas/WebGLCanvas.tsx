"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMotionSafe } from "@/lib/motion";
import { WebGLSceneManager } from "./WebGLSceneManager";

interface WebGLCanvasProps {
  globalProgress: number;
}

export function WebGLCanvas({ globalProgress }: WebGLCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const managerRef = useRef<WebGLSceneManager | null>(null);

  const motionSafe = useMotionSafe();
  const [webglSupported, setWebglSupported] = useState(true);
  const [hasRenderedFallback, setHasRenderedFallback] = useState(false);

  // ── 1. CHECK BROWSER WEBGL CAPABILITIES ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      setWebglSupported(false);
    }
  }, []);

  // Determine quality tier parameters based on window dimensions
  const getQualityTier = () => {
    if (typeof window === "undefined") {
      return { particleCount: 6000, dpr: 2 };
    }
    const width = window.innerWidth;
    const deviceDpr = window.devicePixelRatio || 1;

    if (width < 768) {
      // Mobile quality tier
      return { particleCount: 1500, dpr: 1 };
    } else if (width < 1024) {
      // Tablet quality tier
      return { particleCount: 3000, dpr: Math.min(deviceDpr, 1.5) };
    } else {
      // Desktop quality tier
      return { particleCount: 6000, dpr: Math.min(deviceDpr, 2) };
    }
  };

  useEffect(() => {
    if (!webglSupported || !motionSafe) {
      setHasRenderedFallback(true);
      return;
    }

    if (!containerRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full";
    containerRef.current.appendChild(canvas);

    const { particleCount, dpr } = getQualityTier();
    const width = window.innerWidth;
    const height = window.innerHeight;

    let isWorkerMode = false;
    const hasOffscreen = "transferControlToOffscreen" in HTMLCanvasElement.prototype;

    if (hasOffscreen && typeof Worker !== "undefined") {
      try {
        // Instantiate the web worker
        const worker = new Worker(new URL("./webgl.worker.ts", import.meta.url));
        workerRef.current = worker;

        const offscreen = canvas.transferControlToOffscreen();

        worker.postMessage(
          {
            type: "init",
            canvas: offscreen,
            particleCount,
            dpr,
          },
          [offscreen]
        );

        worker.postMessage({
          type: "resize",
          width,
          height,
          dpr,
        });

        isWorkerMode = true;
      } catch (err) {
        console.warn("Failed to spin up Web Worker for WebGL, falling back to main thread:", err);
      }
    }

    // Main-thread fallback if worker spin-up fails or Offscreen is unsupported
    if (!isWorkerMode) {
      import("./WebGLSceneManager").then(({ WebGLSceneManager }) => {
        try {
          const manager = new WebGLSceneManager(canvas, particleCount, dpr);
          managerRef.current = manager;
          manager.resize(width, height, dpr);
        } catch (err) {
          console.error("Main-thread WebGLSceneManager initialization failed:", err);
          setHasRenderedFallback(true);
        }
      });
    }

    // ── 2. EVENT LISTENERS FOR INTERACTIONS ──
    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

      if (workerRef.current) {
        workerRef.current.postMessage({ type: "mouse", x: mouseX, y: mouseY });
      } else if (managerRef.current) {
        managerRef.current.setMouse(mouseX, mouseY);
      }
    };

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const q = getQualityTier();

      if (workerRef.current) {
        workerRef.current.postMessage({ type: "resize", width: w, height: h, dpr: q.dpr });
      } else if (managerRef.current) {
        managerRef.current.resize(w, h, q.dpr);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      if (workerRef.current) {
        workerRef.current.postMessage({ type: "destroy" });
        workerRef.current.terminate();
        workerRef.current = null;
      }

      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [webglSupported, motionSafe]);

  // Update scroll percent dynamically in the WebGL scene
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "scroll", value: globalProgress });
    } else if (managerRef.current) {
      managerRef.current.setScroll(globalProgress);
    }
  }, [globalProgress]);

  // Renders static CSS gradient fallback if not motion-safe or if WebGL is disabled
  if (hasRenderedFallback || !webglSupported || !motionSafe) {
    return <div className="css-backdrop fixed inset-0 -z-10 h-screen w-screen bg-[#f5f3ef]" />;
  }

  return (
    <div ref={containerRef} className="fixed inset-0 -z-10 h-screen w-screen overflow-hidden bg-transparent" />
  );
}

export default WebGLCanvas;
