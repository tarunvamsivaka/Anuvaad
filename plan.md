1. **Optimize cosine similarity calculation in `app/core/database_session.py`**:
   - Refactor `_sqlite_cosine_distance` to use `operator.mul` with `map` inside `sum()` for vector math operations (e.g., `sum(map(operator.mul, vec1, vec2))`).
   - This avoids generator expression overhead and improves performance on large lists of floats.

2. **Add a journal entry to `.jules/bolt.md`**:
   - Document the learning about using `sum(map(operator.mul, ...))` vs generator expressions for performance-critical math on large lists of floats in Python.

3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done**:
   - Run linter/formatting (`ruff`).
   - Run tests.

4. **Submit PR**:
   - Title: `⚡ Bolt: [performance improvement]`
   - Follow Bolt's requirements for PR description (What, Why, Impact, Measurement).
