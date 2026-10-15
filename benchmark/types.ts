/**
 * Benchmark Suite Type Definitions
 * Contracts defined in PROJECT.md for public evaluation and CI automation.
 */

export interface ComponentMetrics {
  testPassScore: number;      // 0.0 - 100.0 (50% weight)
  diffNormScore: number;      // 0.0 - 100.0 (20% weight)
  astPreserveScore: number;   // 0.0 - 100.0 (20% weight)
  llmEfficiencyScore: number; // 0.0 - 100.0 (10% weight)
  compositeScore: number;     // Weighted sum
}

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
  metrics: ComponentMetrics;
  stats?: {
    stateVariables: number;
    effects: number;
    methodsConverted: number;
    inputLoc: number;
    outputLoc: number;
  };
  warnings?: string[];
  errors?: string[];
  migratedCode?: string;
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
  metadata?: {
    schemaVersion: string;
    evaluatedAt: string;
    commitSha: string;
    branch?: string;
    runner: string;
    nodeVersion?: string;
    operationalCostUsd: string;
  };
  summaryMetrics?: {
    testPassRateScore: number;
    diffNormalizationScore: number;
    astPreservationScore: number;
    llmEfficiencyScore: number;
    totalStateConverted: number;
    totalEffectsConverted: number;
    totalMethodsConverted: number;
  };
  repositories?: Array<{
    id: string;
    name: string;
    stars: number;
    license: string;
    category: string;
    componentCount: number;
    compositeScore: number;
    passRatePercentage: number;
    averageTimeMs: number;
  }>;
}

/**
 * Backward compatibility interface for existing tests
 */
export interface BenchmarkFileResult {
  file: string;
  success: boolean;
  timeMs: number;
  stateVars: number;
  effects: number;
  methods: number;
  errors?: string[];
}

/**
 * Backward compatibility scorecard interface
 */
export interface BenchmarkScorecard {
  totalFiles: number;
  passedCount: number;
  failedCount: number;
  passRatePercentage: number;
  averageTimeMs: number;
  totalStateConverted: number;
  totalEffectsConverted: number;
  totalMethodsConverted: number;
  results: BenchmarkFileResult[];
}

export interface BenchmarkFixture {
  id: string;
  name: string;
  repository: string;
  category: string;
  sourceType: 'js' | 'jsx' | 'ts' | 'tsx';
  code: string;
  testCode?: string;
  description?: string;
  expectedStateKeys?: string[];
  expectedLifecycles?: string[];
}

export interface RepoEntry {
  id: string;
  name: string;
  repo: string;
  stars: number;
  license: string;
  category: string;
  classComponents: number;
  testFramework: string;
  fixtures?: string[];
}

export interface AstPreservationDetails {
  validAst: boolean;
  noRemainingClass: boolean;
  noDanglingThis: boolean;
  propsScore: number;
  jsxScore: number;
  stateScore: number;
  exportsScore: number;
  overallScore: number;
}

export interface DiffNormalizationDetails {
  originalTokens: number;
  transformedTokens: number;
  tokenChurnRatio: number;
  diffScore: number;
}
