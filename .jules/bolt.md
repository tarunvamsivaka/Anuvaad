## 2024-03-21 - BlockCard Rendering
**Learning:** Rendering arrays of complex components like BlockCard (which uses Framer Motion animations) can be a significant performance bottleneck during rapid state updates like SSE streaming or simple text input.
**Action:** Always wrap components rendered in lists with `React.memo` and ensure their props are stable, or consider virtualizing the list.
## 2024-03-21 - React.memo Pitfall
**Learning:** Using an inline arrow function to pass a callback (e.g. `onEditBlock={(val) => handler(idx, val)}`) completely defeats `React.memo`, because it creates a new function reference every render. Also, `useCallback` with state dependencies (like `outputBlocks`) recreates the function every time the state changes.
**Action:** To optimize lists, the child component should accept its index and pass it back to the callback, so the parent can pass the stable function reference directly (e.g. `onEditBlock={handleEditBlock}`). Use functional state updates (`setState(prev => ...)`) inside `useCallback` to avoid state dependencies and keep the function reference stable across renders.
