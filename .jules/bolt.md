## 2024-05-30 - BlockCard Memoization
**Learning:** React components rendering code blocks or complex animations are expensive and need strict memoization to prevent UI lag during array updates. Arrow functions in `onEditBlock={(newEnglish) => ...}` break memoization because they create a new function reference every render.
**Action:** Use `React.memo()` for `BlockCard` and pass stable function references or use functional state updates where possible.
