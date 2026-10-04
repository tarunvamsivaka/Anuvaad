# Local `braces` security fork

This folder is based on the MIT-licensed `braces@3.0.3` package. The original
license is preserved in `LICENSE`.

The local parser rejects patterns deeper than 100 nested blocks. This bounds
the recursive compile and expand walkers affected by CVE-2026-93687
(GHSA-vfj7-8cjw-p6xm). npm installs this fork through the root package
override in `package.json`.

Keep this fork minimal. Recheck the upstream advisory and replace this override
with an official patched release when one is available. The behavior is covered
by `src/tests/braces-security.test.ts`.
