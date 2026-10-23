
## 2023-10-23 - Zustand Shallow Subscription Memory
**Learning:** In React components subscribing to Zustand stores without specific selectors or wrapped in `useShallow`, the component will re-render on any store update.
**Action:** When subscribing to Zustand stores without a specific selector or when extracting multiple state variables, wrap the selector in `useShallow` from `zustand/react/shallow` to prevent unnecessary component re-renders.
