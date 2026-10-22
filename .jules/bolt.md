## 2023-10-24 - Optimize Zustand Store Subscriptions with `useShallow`
**Learning:** In React components subscribing to Zustand stores without specific selectors or wrapped in `useShallow`, the component will re-render on any store update (such as rapidly changing streaming text).
**Action:** Always use the `useShallow` hook from `zustand/react/shallow` when subscribing to multiple state variables in components that do not need to re-render for every single update in the store to prevent redundant evaluations on every render.
