## 2024-05-24 - [React Component Optimization]
**Learning:** In a codebase heavily relying on Server-Sent Events (SSE) and complex UI components (like `BlockCard` with Framer Motion and Monaco editors), optimizing list rendering with `React.memo` and stable function references (using `useCallback` and functional state updates) is crucial to prevent UI lag.
**Action:** When working on complex React lists, proactively check for inline functions and lack of memoization, and apply `React.memo` combined with stable callbacks passing index references from child to parent.
