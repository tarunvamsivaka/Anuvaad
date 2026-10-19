## 2024-05-18 - Zustand useShallow Hook for Component Subscription Performance
**Learning:** Destructuring variables directly from the result of a `useStore()` hook causes the component to re-render on any store change. This is an anti-pattern that drastically deteriorates performance in Next.js apps with frequent store updates, especially in components representing lists or editors.
**Action:** Use `zustand/react/shallow` to construct the object of state values mapping from the store to prevent unnecessary renders when subscribing to multiple values.
