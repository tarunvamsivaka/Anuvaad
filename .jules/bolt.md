## 2025-02-14 - Optimize Zustand Subscriptions with useShallow
**Learning:** In React components subscribing to Zustand stores without specific selectors or wrapped in `useShallow`, the component will re-render on any store update. Rapidly changing state or broad state access without optimization causes UI lag.
**Action:** Always use the `useShallow` hook from `zustand/react/shallow` when subscribing to multiple state variables to prevent redundant evaluations on every render.
