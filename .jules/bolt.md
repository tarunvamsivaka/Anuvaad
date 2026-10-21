## 2024-05-15 - [Optimize Zustand Subscriptions]
**Learning:** In React components subscribing to Zustand stores without specific selectors or wrapped in `useShallow`, the component will re-render on any store update (such as rapidly changing streaming text).
**Action:** Always use the `useShallow` hook from `zustand/react/shallow` when subscribing to multiple state variables.
