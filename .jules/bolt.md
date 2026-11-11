## 2024-11-11 - Optimize Zustand Store Subscriptions with useShallow

**Learning:** In React components subscribing to Zustand stores, destructuring the entire store state (e.g. `const { a, b, c } = useTranslationStore()`) causes the component to re-render on *any* state change in the store, even if the destructured properties didn't change. This is especially problematic with high-frequency updates like streaming text.

**Action:** Always use the `useShallow` hook from `zustand/react/shallow` to wrap the state selector, ensuring the component only re-renders when the specifically mapped properties change. (e.g. `useTranslationStore(useShallow(state => ({ a: state.a, b: state.b })))`). When doing this, be extremely careful to map setter functions correctly (e.g. `setter: state.setter`, NOT `setter: state.stateValue`).
