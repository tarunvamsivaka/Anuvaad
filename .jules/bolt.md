## 2024-05-30 - [Zustand Store Re-renders without Selectors]
**Learning:** In React components subscribing to Zustand stores without specific selectors, the component will re-render on ANY store update. This is critical during SSE streaming where state (like `streamText`) updates rapidly.
**Action:** Always wrap expensive derived states or array mappings (like string concatenations using `.map().join()`) in `useMemo` hooks to prevent redundant evaluations on every stream chunk update.
