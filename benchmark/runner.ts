import { modernizeReactCode, TransformResult } from '../frontend/src/engine';
import {
  BenchmarkFileResult,
  BenchmarkScorecard,
  ComponentBenchmarkResult,
  BenchmarkSuiteSummary,
  BenchmarkFixture,
} from './types';
import { calculateComponentMetrics, aggregateSuiteSummary } from './scorer';
import { loadAllFixtures } from './fixtures';

export * from './types';
export * from './scorer';
export * from './ast-diff';
export * from './badges';

/**
 * Executes migration on a single component fixture or sample code
 */
export function runSingleBenchmark(
  sample: { id?: string; name?: string; repository?: string; sourceType?: 'js' | 'jsx' | 'ts' | 'tsx'; file?: string; code: string }
): {
  fileResult: BenchmarkFileResult;
  componentResult: ComponentBenchmarkResult;
  transformResult: TransformResult;
} {
  const file = sample.file || `${sample.name || sample.id || 'Component'}.jsx`;
  const id = sample.id || file.replace(/\.[^/.]+$/, '').toLowerCase();
  const name = sample.name || file.replace(/\.[^/.]+$/, '');
  const repository = sample.repository || 'curated-oss';
  const sourceType = sample.sourceType || 'jsx';

  const originalLines = sample.code.trim().split('\n').length;
  const startTime = Date.now();

  const transformResult = modernizeReactCode(sample.code);
  const elapsedMs = Math.max(1, transformResult.stats?.timeMs || (Date.now() - startTime));

  const migratedCode = transformResult.code || '';
  const migratedLines = migratedCode.trim().split('\n').length;
  const syntaxValid = Boolean(transformResult.syntaxValid && transformResult.success);
  const testsPassed = syntaxValid && (!transformResult.errors || transformResult.errors.length === 0);

  const metrics = calculateComponentMetrics({
    originalCode: sample.code,
    transformedCode: migratedCode,
    syntaxValid,
    testsPassed,
    executionTimeMs: elapsedMs,
    tokensUsed: 0,
  });

  const stateVars = transformResult.stats?.stateVariables ?? transformResult.stats?.stateVarsCount ?? 0;
  const effects = transformResult.stats?.effects ?? transformResult.stats?.effectsCount ?? 0;
  const methods = transformResult.stats?.methodsConverted ?? 0;

  const fileResult: BenchmarkFileResult = {
    file,
    success: transformResult.success,
    timeMs: elapsedMs,
    stateVars,
    effects,
    methods,
    errors: transformResult.errors,
  };

  const componentResult: ComponentBenchmarkResult = {
    id,
    name,
    repository,
    sourceType,
    originalLines,
    migratedLines,
    syntaxValid,
    testsPassed,
    executionTimeMs: elapsedMs,
    metrics,
    stats: {
      stateVariables: stateVars,
      effects,
      methodsConverted: methods,
      inputLoc: originalLines,
      outputLoc: migratedLines,
    },
    warnings: transformResult.warnings,
    errors: transformResult.errors,
    migratedCode,
  };

  return { fileResult, componentResult, transformResult };
}

/**
 * Runs the benchmark suite across provided test code samples.
 * Preserves 100% backward compatibility with existing tests while producing
 * modern composite metrics and suite summaries.
 */
export function runBenchmark(
  samples: Array<{ file: string; code: string; repository?: string }>
): BenchmarkScorecard & { suiteSummary: BenchmarkSuiteSummary } {
  let passedCount = 0;
  let totalTimeMs = 0;
  let totalState = 0;
  let totalEffects = 0;
  let totalMethods = 0;

  const fileResults: BenchmarkFileResult[] = [];
  const componentResults: ComponentBenchmarkResult[] = [];

  for (const sample of samples) {
    const { fileResult, componentResult } = runSingleBenchmark(sample);

    totalTimeMs += fileResult.timeMs;
    totalState += fileResult.stateVars;
    totalEffects += fileResult.effects;
    totalMethods += fileResult.methods;

    if (fileResult.success) {
      passedCount++;
    }

    fileResults.push(fileResult);
    componentResults.push(componentResult);
  }

  const totalFiles = samples.length;
  const passRatePercentage = totalFiles > 0 ? Math.round((passedCount / totalFiles) * 1000) / 10 : 0;
  const averageTimeMs = totalFiles > 0 ? Math.round((totalTimeMs / totalFiles) * 100) / 100 : 0;

  const suiteSummary = aggregateSuiteSummary(componentResults, '1.0.0', totalTimeMs);

  return {
    totalFiles,
    passedCount,
    failedCount: totalFiles - passedCount,
    passRatePercentage,
    averageTimeMs,
    totalStateConverted: totalState,
    totalEffectsConverted: totalEffects,
    totalMethodsConverted: totalMethods,
    results: fileResults,
    suiteSummary,
  };
}

/**
 * Programmatic benchmark runner for curated open-source fixtures
 */
export function runBenchmarkSuite(
  fixtures?: BenchmarkFixture[]
): BenchmarkSuiteSummary {
  const targetFixtures = fixtures || loadAllFixtures();
  const componentResults: ComponentBenchmarkResult[] = [];
  let totalDurationMs = 0;

  for (const fixture of targetFixtures) {
    const { componentResult } = runSingleBenchmark(fixture);
    componentResults.push(componentResult);
    totalDurationMs += componentResult.executionTimeMs;
  }

  return aggregateSuiteSummary(componentResults, '1.0.0', totalDurationMs);
}
