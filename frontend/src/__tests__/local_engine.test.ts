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

  it('correctly decomposes and translates a Python script (user use case) into step-by-step semantic English', async () => {
    const scriptCode = [
      'num1 = float(input("Enter first number: "))',
      'num2 = float(input("Enter second number: "))',
      'num3 = float(input("Enter third number: "))',
      'largest = max(num1, num2, num3)',
      'print(f"The largest number is: {largest}")',
    ].join('\n');

    const result = await executeLocalOfflineEngine(scriptCode, {
      language: 'python',
      mode: 'code-to-english',
    });

    expect(result.blocks.length).toBe(5);

    // Block 1: num1 input
    expect(result.blocks[0].code_snippet).toBe('num1 = float(input("Enter first number: "))');
    expect(result.blocks[0].english_translation).toContain('Prompts the user with "Enter first number: "');
    expect(result.blocks[0].english_translation).toContain('floating-point number');
    expect(result.blocks[0].english_translation).toContain('`num1`');

    // Block 4: largest = max(num1, num2, num3)
    expect(result.blocks[3].code_snippet).toBe('largest = max(num1, num2, num3)');
    expect(result.blocks[3].english_translation).toContain('`max()`');
    expect(result.blocks[3].english_translation).toContain('greatest value');
    expect(result.blocks[3].english_translation).toContain('`largest`');

    // Block 5: print output
    expect(result.blocks[4].code_snippet).toBe('print(f"The largest number is: {largest}")');
    expect(result.blocks[4].english_translation).toContain('interpolated string');
  });

  it('generates executable code from English prompt offline in English-to-Code mode', async () => {
    const result = await executeLocalOfflineEngine(
      'write a python program to find largest of three numbers',
      {
        language: 'english',
        targetLanguage: 'python',
        mode: 'english-to-code',
      }
    );

    expect(result.blocks.length).toBeGreaterThanOrEqual(1);
    const combinedCode = result.blocks.map((b) => b.code_snippet).join('\n');
    expect(combinedCode).toContain('input');
    expect(combinedCode).toContain('max');
    expect(combinedCode).toContain('print');
  });

  it('translates code between languages offline in Code-to-Code mode', async () => {
    const pyCode = [
      'num1 = float(input("Enter first number: "))',
      'largest = max(num1, 10)',
      'print(f"The largest number is: {largest}")',
    ].join('\n');

    const result = await executeLocalOfflineEngine(pyCode, {
      language: 'python',
      targetLanguage: 'javascript',
      mode: 'code-to-code',
    });

    expect(result.blocks.length).toBe(1);
    const jsCode = result.blocks[0].code_snippet;
    expect(jsCode).toContain('parseFloat(prompt("Enter first number: "))');
    expect(jsCode).toContain('Math.max(num1, 10)');
    expect(jsCode).toContain('console.log(`The largest number is: ${largest}`);');
  });
});
