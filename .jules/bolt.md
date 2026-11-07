## 2025-02-18 - Fast Python Vector Math
**Learning:** For performance-critical math on large lists of floats in Python, generator expressions like `sum(a * b for a, b in zip(v1, v2))` introduce execution overhead.
**Action:** Use `sum(map(operator.mul, v1, v2))` instead to push the iteration and multiplication down to C, providing a ~20% speedup.
