# E2E Test Infra: Anuvaad Client-Side Modernization Platform

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Tests are derived strictly from `ORIGINAL_REQUEST.md` and user specifications, not internal implementation details.
- **Progressive Testability**: Verification does not depend on unbuilt features; Tier 1 tests give clear signals starting with initial milestones.
- **Zero-Tolerance Quality**: 100% test pass rate across all tiers, zero unhandled AST syntax errors (`node.has_error == false` / `@babel/parser` valid AST), clean static build (exit code 0), and clean forensic integrity audit.
- **Methodology**: 4-Tier verification incorporating Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial Testing, and Real-World Workload Testing.

## Feature Inventory Coverage
| # | Feature | Requirement Source | Tier 1 (Req >= 5) | Tier 2 (Req >= 5) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|---------|-------------------|:-----------------:|:-----------------:|:-----------------:|:-------------------:|
| 1 | AST State Conversions (Rules 1-7) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | AST Lifecycle Mappings (Rules 8-18) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | AST Props & Destructuring (Rules 19-21) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | AST Method Bindings (Rules 22-26) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | AST Refs & Instance Fields (Rules 27-31) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 6 | AST Context & Optimization (Rules 32-35) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 7 | AST TypeScript & Signatures (Rules 36-40) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 8 | Web Worker AST In-Memory Engine | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 9 | Legacy 3-Column Decoupling | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 10 | Dual-Pane Monaco Modernization IDE | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 11 | Drag-and-Drop & Preset Upload UX | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 12 | Sub-500ms Real-Time Diff & Syntax Flags | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 13 | BYOK WebCrypto AES-GCM Encryption | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 14 | Cloudflare Pages Zero-Budget Deployment | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 15 | Standalone Benchmark Harness | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 16 | 4-Metric Composite Scoring Engine | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 17 | Benchmark Output & SVG Badges | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 18 | GitHub Actions CI Matrix Workflow | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Runner**: Vitest v3.2.7 (`npm test` / `npm --prefix frontend test`) + Benchmark Runner CLI (`npm run benchmark`).
- **Fixtures Directory**: `benchmark/fixtures/` and `frontend/src/__tests__/fixtures/`.
- **Assertion Standards**:
  - Valid AST parsing with zero parse errors via `@babel/parser`.
  - Functional hook equivalency (useState, useEffect, useRef, useContext, React.memo).
  - Absence of `this.` references in transformed component functions.
  - Non-extractable WebCrypto key operations and ciphertext verification in IndexedDB.
  - Zero-budget Cloudflare static build artifact verification (`frontend/out/index.html`).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Complex Class Modal with Overlay & Portals | State, Lifecycle, Refs, Methods, Props | High |
| 2 | Autocomplete Combobox with Async Fetching | State, Debounced Lifecycle, Refs, TypeScript | High |
| 3 | Tabbed Container with Dynamic Panels | State, Context, PureComponent, DefaultProps | Medium |
| 4 | DatePicker Calendar with Keyboard Navigation | Multi-state, Lifecycle, Callback Refs, Event Handlers | High |
| 5 | Enterprise Data Table with Sorting & Paging | Complex State, TypeScript Interfaces, Instance Fields | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥ 90 test cases (≥ 5 per feature across 18 features).
- **Tier 2 (Boundary & Corner Cases)**: ≥ 90 test cases (empty components, comments, decorators, multiple classes in one file, deeply nested JSX).
- **Tier 3 (Cross-Feature Combinations)**: ≥ 18 pairwise interaction test cases (e.g., TS generic types + state + ref callbacks; PureComponent + contextType + lifecycle).
- **Tier 4 (Real-World Application Scenarios)**: ≥ 5 full application fixture components with end-to-end modernization verification.
- **Total Minimum**: ≥ 203 automated test cases across all suites.
