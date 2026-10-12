import { modernizeReactCode } from '../frontend/src/engine';

export interface BenchmarkFileResult {
  file: string;
  success: boolean;
  timeMs: number;
  stateVars: number;
  effects: number;
  methods: number;
  errors?: string[];
}

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

/**
 * Runs the benchmark suite across provided test code samples
 */
export function runBenchmark(
  samples: Array<{ file: string; code: string }>
): BenchmarkScorecard {
  let passedCount = 0;
  let totalTimeMs = 0;
  let totalState = 0;
  let totalEffects = 0;
  let totalMethods = 0;

  const results: BenchmarkFileResult[] = [];

  for (const sample of samples) {
    const result = modernizeReactCode(sample.code);
    totalTimeMs += result.stats.timeMs;
    totalState += result.stats.stateVariables;
    totalEffects += result.stats.effects;
    totalMethods += result.stats.methodsConverted;

    if (result.success) {
      passedCount++;
    }

    results.push({
      file: sample.file,
      success: result.success,
      timeMs: result.stats.timeMs,
      stateVars: result.stats.stateVariables,
      effects: result.stats.effects,
      methods: result.stats.methodsConverted,
      errors: result.errors,
    });
  }

  const totalFiles = samples.length;
  const passRatePercentage = totalFiles > 0 ? Math.round((passedCount / totalFiles) * 1000) / 10 : 0;
  const averageTimeMs = totalFiles > 0 ? Math.round((totalTimeMs / totalFiles) * 100) / 100 : 0;

  return {
    totalFiles,
    passedCount,
    failedCount: totalFiles - passedCount,
    passRatePercentage,
    averageTimeMs,
    totalStateConverted: totalState,
    totalEffectsConverted: totalEffects,
    totalMethodsConverted: totalMethods,
    results,
  };
}
