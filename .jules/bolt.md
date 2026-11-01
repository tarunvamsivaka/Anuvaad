## 2024-05-24 - Zustand destructuring causes excessive re-renders
**Learning:** Components subscribing to a Zustand store without specific selectors or `useShallow` re-render on *any* state change within the store (e.g. fast streaming text updates).
**Action:** Always wrap `useStore` with `useShallow` when selecting multiple state variables to prevent $O(N)$ calculations and redundant evaluations.
