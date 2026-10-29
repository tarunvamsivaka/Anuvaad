## 2024-05-24 - Zustand Store Re-Renders During Streaming
**Learning:** In a codebase with rapidly updating global state (like SSE streaming text), components subscribing to the entire store (e.g., `useTranslationStore()`) instead of using specific selectors or `useShallow` will re-render on every token, causing significant UI lag, especially in heavy components like Monaco editor wrappers.
**Action:** Always use `useShallow` or atomic selectors when subscribing to Zustand stores in large components to prevent unnecessary re-renders during high-frequency state updates.
