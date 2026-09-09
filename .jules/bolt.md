## 2026-09-09 - [Memoize List Item OutputPanel BlockCard]
**Learning:** Component list items that use Framer Motion can cause expensive re-renders. When functional state updates and inline callbacks are involved, passing stable callback references avoids breaking React.memo memoization. Using React.SetStateAction<T> over implicit dispatch types ensures functional state updates are properly handled.
**Action:** Use React.memo() and stable useCallback handlers (passing index from child) for long or computationally expensive lists.
