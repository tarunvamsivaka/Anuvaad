import { useState, useEffect, RefObject } from "react";
import { registerScrollTrigger } from "@/lib/motion";

interface UseScrollProgressOptions {
  triggerRef: RefObject<HTMLElement | null>;
  start?: string;
  end?: string;
}

export function useScrollProgress({
  triggerRef,
  start = "top top",
  end = "bottom bottom",
}: UseScrollProgressOptions): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let scrollTriggerInstance: any = null;

    if (!triggerRef.current) return;

    registerScrollTrigger().then(({ ScrollTrigger }) => {
      if (!triggerRef.current) return;

      scrollTriggerInstance = ScrollTrigger.create({
        trigger: triggerRef.current,
        start,
        end,
        scrub: true,
        onUpdate: (self) => {
          setProgress(self.progress);
        },
      });
    });

    return () => {
      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
      }
    };
  }, [triggerRef, start, end]);

  return progress;
}
