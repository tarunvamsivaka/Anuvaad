import { describe, it, expect, vi } from 'vitest';
import { executeLocalOfflineEngine } from '../lib/local-engine';

describe('Zero-Server Offline Local Engine', () => {
  it('translates TypeScript code completely offline with 0 fetch network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const sampleCode = [
      'export function multiply(a: number, b: number): number {',
      '  if (a === 0 || b === 0) return 0;',
      '  return a * b;',
      '}',
      '',
      'export function divide(a: number, b: number): number {',
      '  if (b === 0) {',
      '    throw new Error("Division by zero");',
      '  }',
      '  return a / b;',
      '}',
    ].join('\n');

    const chunks: string[] = [];
    const result = await executeLocalOfflineEngine(sampleCode, {
      language: 'typescript',
      onChunk: (c) => chunks.push(c),
    });

    // Zero network calls
    expect(fetchSpy).not.toHaveBeenCalled();

    // Fast deterministic execution
    expect(result.execution_time_ms).toBeLessThan(1000);
    expect(result.model_used).toBe('offline-ast-engine');
    expect(result.blocks.length).toBe(2);

    // Block 1: multiply
    expect(result.blocks[0].code_snippet).toContain('multiply');
    expect(result.blocks[0].english_translation).toContain('multiply');
    expect(result.blocks[0].english_translation).toContain('parameters');
    expect(result.blocks[0].startLine).toBe(1);
    expect(result.blocks[0].endLine).toBe(4);

    // Block 2: divide
    expect(result.blocks[1].code_snippet).toContain('divide');
    expect(result.blocks[1].english_translation).toContain('divide');
    expect(result.blocks[1].startLine).toBe(6);
    expect(result.blocks[1].endLine).toBe(11);

    // Verify chunk streaming
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain('multiply');

    fetchSpy.mockRestore();
  });

  it('handles Python code offline with cyclomatic complexity estimation', async () => {
    const pyCode = [
      'def evaluate_score(score):',
      '    if score > 90:',
      '        return "A"',
      '    elif score > 80:',
      '        return "B"',
      '    else:',
      '        return "C"',
    ].join('\n');

    const result = await executeLocalOfflineEngine(pyCode, { language: 'python' });

    expect(result.blocks.length).toBe(1);
    expect(result.blocks[0].english_translation).toContain('evaluate_score');
    expect(result.blocks[0].english_translation).toContain('branching control flow');
    expect(result.blocks[0].model_used).toBe('offline-ast-engine');
  });
});
