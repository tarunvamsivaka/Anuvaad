## 2025-02-27 - [Cosine Similarity Optimization]
**Learning:** `sum(map(operator.mul, v1, v2))` is significantly faster than generator expressions like `sum(a * b for a, b in zip(vec1, vec2))` for mathematical operations on lists of floats in Python due to CPython's C-level map execution.
**Action:** Use `map` with `operator` functions for hot-path mathematical aggregate calculations in Python.

## 2025-02-27 - [Zustand React Re-Renders]
**Learning:** Destructuring multiple variables directly from `useStore()` causes the component to re-render on any store state update.
**Action:** Always wrap Zustand store selections with `useShallow` when selecting multiple items to ensure the component only re-renders when the selected data changes.
