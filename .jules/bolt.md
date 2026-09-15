## 2024-05-18 - [BlockCard memoization]
**Learning:** Frontend components rendering code blocks (`BlockCard` within `OutputPanel`) are computationally expensive due to Framer Motion animations and complex layouts. Missing `React.memo` causes UI lag during state updates or SSE streaming.
**Action:** Always use `React.memo` for these list items, and ensure stable function references are passed from the parent using functional state updates (`setState(prev => ...)`).
