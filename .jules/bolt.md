## 2024-11-11 - [Vector Math Optimization]
**Learning:** Generator expressions in Python (e.g., `sum(a * b for a, b in zip(v1, v2))`) introduce significant execution overhead for large lists of floats, making them a performance bottleneck for operations like vector cosine similarity.
**Action:** Use `sum(map(operator.mul, v1, v2))` instead of generator expressions for performance-critical mathematical operations on large lists.
