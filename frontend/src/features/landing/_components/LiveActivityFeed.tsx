"use client";

import React, { useState, useEffect } from "react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";
import { Code2, Zap, FileJson, CheckCircle2 } from "lucide-react";

const FEED_MESSAGES = [
  { icon: Code2, text: "Translated 420 lines of Java to Python", user: "dev_team_alpha" },
  { icon: Zap, text: "Optimized complex nested loops", user: "system_optimizer" },
  { icon: FileJson, text: "Generated API schema from legacy C++", user: "backend_eng" },
  { icon: CheckCircle2, text: "Parsed 1.2M node AST map", user: "analyzer_bot" },
  { icon: Code2, text: "Refactored React class to hooks", user: "frontend_lead" },
  { icon: Zap, text: "Instant test coverage generated", user: "qa_agent" },
];

export function LiveActivityFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { getContext } = useGsapContext(containerRef);

  useEffect(() => {
    if (!isMotionSafe()) return;
    const interval = setInterval(() => {
      // Pick a random message that is not the current one
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * FEED_MESSAGES.length);
      } while (nextIndex === currentIndex);
      
      setCurrentIndex(nextIndex);
    }, 4500);

    return () => clearInterval(interval);
  }, [currentIndex]);

  useEffect(() => {
    if (!isMotionSafe() || !containerRef.current) return;
    let isMounted = true;
    let ctx: gsap.Context;

    getContext().then((context) => {
      if (!isMounted) return;
      ctx = context;
      ctx.add(() => {
        // Animate the toast in and out on index change
        gsap.fromTo(
          ".activity-toast",
          { opacity: 0, y: 20, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.2)" }
        );
        
        // Setup fade out before the next change (4500ms total interval, fade out at 4000)
        gsap.to(".activity-toast", {
          opacity: 0,
          y: -10,
          scale: 0.95,
          duration: 0.4,
          delay: 4.0,
          ease: "power2.in"
        });
      });
    });

    return () => {
      isMounted = false;
      ctx?.revert();
    };
  }, [currentIndex, getContext]);

  const activeMessage = FEED_MESSAGES[currentIndex];
  const Icon = activeMessage.icon;

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-6 left-6 z-50 pointer-events-none hidden md:block"
    >
      <div className="activity-toast bg-white/90 backdrop-blur-md border border-neutral-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.08)] rounded-full px-4 py-2.5 flex items-center gap-3">
        <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <Icon className="h-3 w-3" />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-neutral-800 leading-tight">
            {activeMessage.text}
          </span>
          <span className="text-[9px] font-mono text-neutral-400">
            {activeMessage.user} • just now
          </span>
        </div>
      </div>
    </div>
  );
}
