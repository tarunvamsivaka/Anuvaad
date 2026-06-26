"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { isMotionSafe } from "@/lib/motion";

export function MouseOrb() {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMotionSafe() || !orbRef.current) return;

    // We use GSAP quickTo for highly performant, smooth mouse tracking
    const xTo = gsap.quickTo(orbRef.current, "x", { duration: 0.8, ease: "power3" });
    const yTo = gsap.quickTo(orbRef.current, "y", { duration: 0.8, ease: "power3" });

    const onMouseMove = (e: MouseEvent) => {
      // Center the orb on the cursor
      xTo(e.clientX);
      yTo(e.clientY);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    
    // Initial position (center of screen)
    gsap.set(orbRef.current, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      xPercent: -50,
      yPercent: -50,
    });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      {/* 
        This is a soft, glowing orb that follows the mouse cursor.
        It has a very low opacity so it only slightly tints the background behind the content.
      */}
      <div 
        ref={orbRef}
        className="absolute w-[600px] h-[600px] rounded-full mix-blend-multiply opacity-[0.15] blur-[80px]"
        style={{
          background: "radial-gradient(circle, rgba(200,134,10,0.8) 0%, rgba(3,79,70,0.4) 40%, rgba(245,243,239,0) 70%)",
        }}
      />
    </div>
  );
}
