## 2024-10-15 - [Zustand Store Subscription Optimization]
**Learning:** Component using Zustand store without `useShallow` re-renders every time any state in the store updates. This is critical for streaming texts where updates are rapid.
**Action:** Use `useShallow` from `zustand/react/shallow` when selecting multiple state items from a Zustand store to prevent unnecessary renders, specifically for `useTranslationStore` in `OutputPanel` and `InputPanel`.
