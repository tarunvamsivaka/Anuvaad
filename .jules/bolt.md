## 2024-09-27 - [OutputPanel Re-render Bottleneck]
**Learning:** `OutputPanel` subscribes to `useTranslationStore` which includes `streamText`. During SSE streaming, `streamText` updates rapidly, causing the entire component to re-render. Inline O(N) operations on `outputBlocks` (like `.map().join()`) for generating code/english text are evaluated on every frame, causing CPU spikes.
**Action:** Wrap all derived string aggregations from `outputBlocks` in `useMemo` to ensure they are only recalculated when `outputBlocks` actually changes, not when `streamText` updates.
