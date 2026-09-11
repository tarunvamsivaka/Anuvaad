## 2024-05-24 - React Component Memoization Anti-pattern
**Learning:** Found performance bottlenecks in frontend code where components rendering code blocks (like `BlockCard` within lists) use expensive animations (`framer-motion`) and are NOT memoized. In lists with SSE streaming or frequent state updates, this causes heavy unnecessary re-renders.
**Action:** Use `React.memo` for components in lists that receive stable props, and use functional state updates for callbacks passed to child components to maintain referential equality.
