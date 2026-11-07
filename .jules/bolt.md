
## $(date +%Y-%m-%d) - Optimize Zustand Store Subscriptions with useShallow
**Learning:** In React components subscribing to Zustand stores without specific selectors or wrapped in `useShallow`, the component will re-render on *any* store update (such as rapidly changing streaming text). This can cause significant UI lag, especially in editors or complex panels.
**Action:** Always use the `useShallow` hook from `zustand/react/shallow` when subscribing to multiple state variables. When refactoring to `useShallow`, ensure *every* destructured variable is explicitly mapped in the returned object to prevent critical undefined state bugs.
