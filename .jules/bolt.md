## 2024-11-10 - Python generator expression overhead in math loops
**Learning:** Using generator expressions (e.g. `sum(a * b for a, b in zip(v1, v2))`) adds significant overhead in Python for mathematical operations on large lists of floats. `sum(map(operator.mul, v1, v2))` is significantly faster.
**Action:** Use `map` with `operator.mul` instead of generator expressions for performance-critical vector math in Python.
