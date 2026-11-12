# Repository data integrity audit

**Reviewed:** 2026-11-12

## Benchmark scorecard

`results/latest.json` is a generated local benchmark artifact, not a current
production measurement. Its metadata says `commitSha: local-head` and records
an evaluation timestamp of 2026-10-13. The aggregate repository entries all
report exactly 5,000 stars, while `benchmark/repos.json` contains different
counts. `benchmark/scorer.ts` hard-codes 5,000 stars, `MIT`, and `React
Ecosystem` for every repository. Those aggregate values are not sourced from
the repository records and should not be presented as current facts.

The benchmark runner also does not execute the source repositories' test
suites. In `benchmark/runner.ts`, `testsPassed` currently means that the
codemod returned syntactically valid output without transform errors. The
scorecard's “Test Suite Pass Rate” and “testsPassed” labels therefore overstate
what was measured. The 100% figures in this artifact are not evidence that
upstream tests passed.

## Data source gap and safe publication rule

No authoritative, dated source for live repository metadata or upstream test
results was supplied with this update. The counts in `benchmark/repos.json`
are recorded inputs of unknown capture date, not verified current counts. Do
not refresh them by guessing, and do not publish the generated scorecard as a
verified upstream benchmark until the following are supplied or implemented:

1. A dated source record (for example, GitHub repository API responses) for
   repository stars, license, and repository identity.
2. A reproducible test command and pinned source revision for each upstream
   fixture, with actual test output captured by the runner.
3. A benchmark run bound to the exact source commit and runtime used, with
   metric names limited to the checks actually performed.

Until then, treat `results/latest.json` and its badges as historical local
codemod diagnostics only. They must not be described as current repository
statistics, upstream test results, or production performance guarantees.

## Repository changes in this update

This audit documents the verified discrepancies without rewriting benchmark
measurements or inserting guessed replacement data. Refreshing the scorecard
requires the missing source data and a runner that executes the claimed tests.
