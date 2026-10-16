import { describe, it, expect, beforeEach } from 'vitest';
import { extractAstLineRanges, annotateBlocksWithLineRanges } from '../lib/ast-line-mapper';
import { useTranslationStore } from '../features/translate/_store/useTranslationStore';

describe('AST UI Integration & Line Mapper', () => {
  beforeEach(() => {
    useTranslationStore.setState({
      input: '',
      outputBlocks: null,
      blockIds: [],
      blocksById: {},
      activeHoveredBlockId: null,
      executionEngine: 'cloud',
    });
  });

  it('extracts AST line ranges from TypeScript / React code', () => {
    const code = [
      'import React from "react";',
      '',
      'export function Counter({ initial = 0 }: { initial?: number }) {',
      '  const [count, setCount] = React.useState(initial);',
      '  return <button onClick={() => setCount(count + 1)}>{count}</button>;',
      '}',
      '',
      'export class Helper {',
      '  static format(val: number) {',
      '    return String(val);',
      '  }',
      '}',
    ].join('\n');

    const ranges = extractAstLineRanges(code, 'typescript');
    expect(ranges.length).toBeGreaterThanOrEqual(2);

    const fnRange = ranges.find((r) => r.type === 'function' || r.type === 'export');
    expect(fnRange).toBeDefined();
    expect(fnRange!.startLine).toBe(3);
    expect(fnRange!.endLine).toBe(6);

    const classRange = ranges.find((r) => r.type === 'class' || r.name === 'Helper');
    expect(classRange).toBeDefined();
    expect(classRange!.startLine).toBe(8);
    expect(classRange!.endLine).toBe(12);
  });

  it('extracts structural line ranges from Python code', () => {
    const pyCode = [
      'import os',
      '',
      'def calculate_total(items):',
      '    total = 0',
      '    for item in items:',
      '        total += item.price',
      '    return total',
      '',
      'class ShoppingCart:',
      '    def __init__(self):',
      '        self.items = []',
    ].join('\n');

    const ranges = extractAstLineRanges(pyCode, 'python');
    expect(ranges.length).toBe(2);
    expect(ranges[0].name).toBe('calculate_total');
    expect(ranges[0].startLine).toBe(3);
    expect(ranges[0].endLine).toBe(8);

    expect(ranges[1].name).toBe('ShoppingCart');
    expect(ranges[1].startLine).toBe(9);
    expect(ranges[1].endLine).toBe(11);
  });

  it('annotates blocks with startLine and endLine based on source snippet', () => {
    const sourceCode = [
      'function add(a, b) {',
      '  return a + b;',
      '}',
      '',
      'function subtract(a, b) {',
      '  return a - b;',
      '}',
    ].join('\n');

    const rawBlocks = [
      {
        id: 'block-1',
        code_snippet: 'function add(a, b) {\n  return a + b;\n}',
        english_translation: 'Adds two numbers.',
      },
      {
        id: 'block-2',
        code_snippet: 'function subtract(a, b) {\n  return a - b;\n}',
        english_translation: 'Subtracts b from a.',
      },
    ];

    const annotated = annotateBlocksWithLineRanges(sourceCode, rawBlocks, 'javascript');
    expect(annotated[0].startLine).toBe(1);
    expect(annotated[0].endLine).toBe(3);
    expect(annotated[1].startLine).toBe(5);
    expect(annotated[1].endLine).toBe(7);
  });

  it('updates activeHoveredBlockId and executionEngine in useTranslationStore', () => {
    const store = useTranslationStore.getState();
    expect(store.activeHoveredBlockId).toBeNull();
    expect(store.executionEngine).toBe('cloud');

    store.setActiveHoveredBlockId('block-42');
    expect(useTranslationStore.getState().activeHoveredBlockId).toBe('block-42');

    store.setExecutionEngine('offline');
    expect(useTranslationStore.getState().executionEngine).toBe('offline');

    store.setActiveHoveredBlockId(null);
    expect(useTranslationStore.getState().activeHoveredBlockId).toBeNull();
  });

  it('automatically annotates line ranges when setOutputBlocks is invoked with source input', () => {
    const source = 'const x = 10;\nconst y = 20;';
    useTranslationStore.setState({ input: source, detectedLang: 'javascript' });

    useTranslationStore.getState().setOutputBlocks([
      {
        id: 'b1',
        code_snippet: 'const x = 10;',
        english_translation: 'Defines x as 10',
      },
    ]);

    const state = useTranslationStore.getState();
    expect(state.outputBlocks).not.toBeNull();
    expect(state.outputBlocks![0].startLine).toBe(1);
    expect(state.outputBlocks![0].endLine).toBe(1);
  });
});
