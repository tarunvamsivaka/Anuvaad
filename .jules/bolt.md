## 2024-06-11 - Optimize string derivations in streaming components
**Learning:** Rendering derivations like `.map().join()` within a component that subscribes to high-frequency streaming states (like SSE stream text) causes significant performance degradation because it triggers $O(N)$ calculations on every token received.
**Action:** Always wrap expensive derived states or array mappings in `useMemo` hooks when a component subscribes to rapid store updates (e.g. streaming) without selectors.
