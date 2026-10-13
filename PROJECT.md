# Project: Anuvaad Client-Side React Modernization Platform

## Architecture
Anuvaad is a 100% client-side, browser-based React class-to-hooks modernization platform backed by an automated 500-repo public evaluation benchmark. All code transformations execute off-thread inside Web Workers using Babel AST transforms in volatile RAM with zero server-side storage, zero disk persistence, and $0.00/month Cloudflare Pages hosting.

```
[User Browser]
    │
    ├── Dual-Pane Monaco IDE (page.tsx, MonacoDualPane.tsx)
    │     ├── Single-File Paste / Drag-and-Drop Dropzone (.js, .jsx, .ts, .tsx)
    │     ├── Monaco Side-by-Side & Unified Diff Views
    │     └── 1-Click Sample Preset Dropdown
    │
    ├── Off-Thread Web Worker (codemod.worker.ts, dispatcher.ts)
    │     └── Deterministic AST Codemod Engine (40 Rules)
    │           ├── @babel/parser (JSX + TS parsing)
    │           ├── @babel/traverse (AST rule matching & transform)
    │           └── @babel/generator (Code synthesis & formatting)
    │
    ├── BYOK Security Vault (vault.ts)
    │     ├── WebCrypto AES-256-GCM (Non-extractable CryptoKey)
    │     └── Browser IndexedDB Private Storage (Zero plaintext persistence)
    │
    └── Public Evaluation Benchmark Harness (benchmark/)
          ├── Curated 500-Repo Component Fixtures (fixtures/)
          ├── Benchmark Runner & AST Diff Validator (runner.ts, ast-diff.ts)
          ├── 4-Metric Composite Scorer (scorer.ts: 50% Test, 20% Diff, 20% AST, 10% LLM)
          ├── SVG Badge Generator (badges.ts)
          └── GitHub Actions Matrix CI (.github/workflows/benchmark-matrix.yml)
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | AST State Conversions (Rules 1-7) | Constructor & class property state, `this.setState` object & functional calls, scalar & multi-key state, state destructuring | M1 | Survey R1 |
| 2 | AST Lifecycle Mappings (Rules 8-18) | `componentDidMount`, `componentWillUnmount`, `componentDidUpdate`, `shouldComponentUpdate`, `getDerivedStateFromProps`, `getSnapshotBeforeUpdate`, `componentDidCatch` diagnostics | M1 | Survey R1 |
| 3 | AST Props & Destructuring (Rules 19-21) | `this.props` parameter mapping, props destructuring, defaultProps & propTypes preservation | M1 | Survey R1 |
| 4 | AST Method & Binding Normalization (Rules 22-26) | `.bind(this)` removal in constructor, arrow methods, class regular methods conversion to const functions, no dangling `this` | M1 | Survey R1 |
| 5 | AST Refs & Instance Fields (Rules 27-31) | `React.createRef()` and callback refs to `useRef()`, class instance properties to `useRef()` or local variables | M1 | Survey R1 |
| 6 | AST Context & Optimization (Rules 32-35) | `static contextType` and `Consumer` to `useContext()`, `PureComponent` to `React.memo()`, `forceUpdate()` to `useReducer()` | M1 | Survey R1 |
| 7 | AST TypeScript & Signatures (Rules 36-40) | Extraction of `React.Component<P, S>` type generics into typed props, preservation of interfaces, type assertions, JSDoc preservation | M1 | Survey R1 |
| 8 | Web Worker AST In-Memory Engine | Pure off-thread worker transformation pipeline in RAM with zero server communication (<50ms execution) | M1 | Survey R1 |
| 9 | Legacy 3-Column Decoupling | Complete removal of legacy 3-column layout (`GlobalSidebar`, `ContextFileTree`), pgvector tables, and server ZDR modals | M2 | Survey R2 |
| 10 | Dual-Pane Monaco Modernization IDE | Responsive full-width Monaco diff editor with side-by-side & unified diff presentation, line numbers, and theme alignment | M2 | Survey R2 |
| 11 | Drag-and-Drop & Preset Upload UX | File dropzone overlay supporting `.js`, `.jsx`, `.ts`, `.tsx`, single-file pasting, and 1-click sample presets | M2 | Survey R2 |
| 12 | Sub-500ms Real-Time Diff & Syntax Indicators | Web Worker bridge delivering instantaneous visual diff presentation, transformation stats, and AST syntax validation flags | M2 | Survey R2 |
| 13 | BYOK WebCrypto AES-GCM Encryption | Client-side 256-bit AES-GCM encryption with non-extractable keys in IndexedDB (`lib/vault.ts`), removing insecure `localStorage` | M3 | Survey R4 |
| 14 | Cloudflare Pages Zero-Budget Deployment | Next.js static export (`output: 'export'`), static `public/_headers` (strict CSP), zero server compute, clean build code 0 | M3 | Survey R4 |
| 15 | Standalone Benchmark Harness | Executable CLI and programmatic runner in `benchmark/` testing curated React class component fixtures | M4 | Survey R3 |
| 16 | 4-Metric Composite Scoring Engine | Mathematical evaluation: 50% test pass rate, 20% diff size normalization, 20% semantic AST preservation, 10% LLM efficiency | M4 | Survey R3 |
| 17 | Benchmark Output & SVG Badges | Generation of structured `results/latest.json` and standalone SVG vector badges for score, pass rate, and zero-dollar cost | M4 | Survey R3 |
| 18 | GitHub Actions CI Matrix Workflow | `.github/workflows/benchmark-matrix.yml` running Node 20/22 matrix, running tests, benchmarks, and generating step summaries | M4 | Survey R3 |
| 19 | Final E2E Test Suite Pass (100%) | Verification of 100% test pass across all 4 tiers of independent requirement-driven E2E tests | M5 | Dual-Track |
| 20 | Tier 5 Adversarial Coverage Hardening | Challenger-driven white-box testing of edge cases, deeply nested classes, and malformed AST structures | M5 | Dual-Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core AST Codemod Engine (40 Rules) | 40 deterministic rules, Web Worker execution, AST validation | None | DONE |
| M2 | Modernization IDE Interface & Decoupling | Monaco diff view, drag-and-drop, sample presets, legacy pruning | M1 | IN_PROGRESS |
| M3 | BYOK Security & Cloudflare Deployment | WebCrypto AES-GCM in IndexedDB, Next.js static export, headers | M2 | IN_PROGRESS |
| M4 | Public Evaluation Benchmark & CI Matrix | Standalone runner, composite scoring, SVG badges, GitHub Actions CI | M1 | IN_PROGRESS |
| M5 | Final E2E Acceptance & Adversarial Hardening | 100% E2E test pass (Tiers 1-4) + Tier 5 Challenger loop + Clean Audit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### Codemod Engine (`frontend/src/engine`)
```typescript
export interface TransformOptions {
  componentName?: string;
  removeDeadMethods?: boolean;
  arrowMethods?: boolean;
  extractPropsInterface?: boolean;
  useCallbackForHandlers?: boolean;
}

export interface TransformChange {
  type: 'state' | 'effect' | 'ref' | 'context' | 'method' | 'props' | 'syntax' | 'type';
  description: string;
  from?: string;
  to?: string;
}

export interface TransformResult {
  code: string;
  changes: TransformChange[];
  stats: {
    stateVarsCount: number;
    effectsCount: number;
    refsCount: number;
    methodsConverted: number;
    timeMs: number;
  };
  warnings: string[];
  syntaxValid: boolean;
}

export function modernizeReactCode(sourceCode: string, options?: TransformOptions): TransformResult;
```

### BYOK Vault Contract (`frontend/src/lib/vault.ts`)
```typescript
export interface VaultKeyMetadata {
  provider: 'cerebras' | 'gemini' | 'openai' | 'anthropic';
  maskedKey: string;
  updatedAt: number;
}

export async function storeApiKey(provider: string, apiKey: string): Promise<void>;
export async function retrieveApiKey(provider: string): Promise<string | null>;
export async function removeApiKey(provider: string): Promise<void>;
export async function getVaultMetadata(): Promise<VaultKeyMetadata[]>;
```

### Benchmark Metric Contract (`benchmark/types.ts`)
```typescript
export interface ComponentBenchmarkResult {
  id: string;
  name: string;
  repository: string;
  sourceType: 'js' | 'jsx' | 'ts' | 'tsx';
  originalLines: number;
  migratedLines: number;
  syntaxValid: boolean;
  testsPassed: boolean;
  executionTimeMs: number;
  metrics: {
    testPassScore: number;     // 0.0 - 100.0 (50% weight)
    diffNormScore: number;     // 0.0 - 100.0 (20% weight)
    astPreserveScore: number;  // 0.0 - 100.0 (20% weight)
    llmEfficiencyScore: number;// 0.0 - 100.0 (10% weight)
    compositeScore: number;    // weighted total
  };
}

export interface BenchmarkSuiteSummary {
  timestamp: string;
  version: string;
  totalComponents: number;
  syntaxValidCount: number;
  allTestsPassedCount: number;
  averageCompositeScore: number;
  passRatePercentage: number;
  totalDurationMs: number;
  results: ComponentBenchmarkResult[];
}
```

## Code Layout
```
Anuvaad/
├── .github/workflows/
│   └── benchmark-matrix.yml         # Matrix CI running Node 20/22 regressions
├── benchmark/
│   ├── fixtures/                    # Curated React class component fixtures
│   ├── types.ts                     # Benchmark schema & result types
│   ├── runner.ts                    # Migration execution runner
│   ├── scorer.ts                    # 4-metric composite scoring formula
│   ├── ast-diff.ts                  # Semantic AST preservation validator
│   ├── badges.ts                    # Standalone SVG vector badge generator
│   └── cli.ts                       # CLI executable for benchmark execution
├── frontend/
│   ├── public/
│   │   └── _headers                 # Cloudflare Pages edge security headers (CSP)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Wispr Flow neutral dark layout
│   │   │   └── page.tsx             # Clean Dual-Pane IDE root view
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   └── MonacoDualPane.tsx # Monaco diff view + drag-and-drop
│   │   │   ├── layout/
│   │   │   │   └── ModernNavbar.tsx   # Minimal header with BYOK & actions
│   │   │   └── settings/
│   │   │       └── ByokModal.tsx      # WebCrypto encrypted key manager
│   │   ├── engine/
│   │   │   ├── rules/
│   │   │   │   ├── classToHooks.ts    # 40 AST codemod rules orchestrator
│   │   │   │   ├── stateRules.ts      # State conversion rules 1-7
│   │   │   │   ├── lifecycleRules.ts  # Lifecycle rules 8-18
│   │   │   │   ├── bindingRules.ts    # Method & ref rules 19-31
│   │   │   │   └── typeRules.ts       # Context & TypeScript rules 32-40
│   │   │   ├── codemod.worker.ts      # Web Worker transformation script
│   │   │   ├── dispatcher.ts          # Off-thread worker dispatcher
│   │   │   ├── validator.ts           # AST syntax validator
│   │   │   └── types.ts               # Codemod contracts
│   │   ├── lib/
│   │   │   └── vault.ts               # WebCrypto AES-GCM + IndexedDB
│   │   └── __tests__/                 # Vitest unit test suites
│   ├── next.config.mjs              # output: 'export' for Cloudflare Pages
│   └── vitest.config.ts             # Vitest test configuration
└── results/
    ├── latest.json                  # Output benchmark metrics
    ├── badge-score.svg              # Composite score badge
    └── badge-pass-rate.svg          # Pass rate percentage badge
```
