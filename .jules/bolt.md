## 2023-11-20 - [Zustand Store Reactivity]
**Learning:** In Next.js components subscribing to large Zustand stores, accessing properties directly from the `useTranslationStore()` object returned without `useShallow` triggers a re-render every time ANY store variable changes (like a fast-changing `sourceCode` during text streaming).
**Action:** Always use `useShallow` when destructuring multiple store properties (e.g. `useTranslationStore(useShallow(state => ({ prop: state.prop })))`) to prevent root-level re-renders and use `useMemo` for any $O(N)$ derivations.
