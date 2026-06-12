import { useMemo } from "react";
import { SceneConfig, ActiveSceneState } from "../_types";

export function useSceneOrchestrator(
  globalProgress: number,
  scenes: SceneConfig[]
): ActiveSceneState {
  return useMemo(() => {
    const totalWeight = scenes.reduce((sum, s) => sum + s.scrollWeight, 0);

    const sceneRanges: { scene: SceneConfig; start: number; end: number }[] = [];
    let accumulatedWeight = 0;
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const start = accumulatedWeight / totalWeight;
      accumulatedWeight += scene.scrollWeight;
      const end = accumulatedWeight / totalWeight;
      sceneRanges.push({
        scene,
        start,
        end,
      });
    }

    // Find the active scene based on globalProgress (clamp globalProgress 0-1)
    const clampedProgress = Math.min(1, Math.max(0, globalProgress));

    // Default fallback
    let activeIndex = 0;
    let localProgress = 0;

    for (let i = 0; i < sceneRanges.length; i++) {
      const { start, end } = sceneRanges[i];
      if (clampedProgress >= start && clampedProgress <= end) {
        activeIndex = i;
        const range = end - start;
        localProgress = range > 0 ? (clampedProgress - start) / range : 0;
        break;
      }
    }

    // Edge case for exactly 1.0 (last item)
    if (clampedProgress >= 1) {
      activeIndex = sceneRanges.length - 1;
      localProgress = 1;
    }

    return {
      activeId: scenes[activeIndex].id,
      activeIndex,
      localProgress,
      globalProgress: clampedProgress,
    };
  }, [globalProgress, scenes]);
}
