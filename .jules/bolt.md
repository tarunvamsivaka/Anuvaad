## 2024-11-06 - [Avoid generator expressions in performance-critical vector math]
**Learning:** Using `sum(a * b for a, b in zip(vec1, vec2))` introduces significant execution overhead compared to `sum(map(operator.mul, vec1, vec2))` for large lists of floats (e.g. cosine distance math). The `map` implementation runs ~20-30% faster in Python.
**Action:** When performing performance-critical math on large lists of floats (like cosine distance calculations, especially for in-memory SQLite fallbacks handling vectors), use `sum(map(operator.mul, ...))` rather than generator expressions.
