import { describe, it, expect } from 'vitest';
import { classifyClipboardText } from '../lib/smart-clipboard';

describe('Smart Clipboard Auto-Classifier', () => {
  it('classifies unified git diffs correctly', () => {
    const diff = [
      'diff --git a/src/app.ts b/src/app.ts',
      'index 1234567..abcdefg 100644',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,5 +1,6 @@',
      ' import express from "express";',
      '+import cors from "cors";',
    ].join('\n');

    const result = classifyClipboardText(diff);
    expect(result.kind).toBe('diff');
    expect(result.detectedLanguage).toBe('diff');
    expect(result.badgeLabel).toContain('Git Diff');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('classifies Python stack traces correctly', () => {
    const trace = [
      'Traceback (most recent call last):',
      '  File "app.py", line 42, in <module>',
      '    result = compute(data)',
      '  File "utils.py", line 17, in compute',
      '    raise ValueError("Invalid input")',
      'ValueError: Invalid input',
    ].join('\n');

    const result = classifyClipboardText(trace);
    expect(result.kind).toBe('stacktrace');
    expect(result.detectedLanguage).toBe('python');
    expect(result.badgeLabel).toMatch(/Python Stack Trace/);
  });

  it('classifies TypeScript/JavaScript modules as code', () => {
    const tsCode = [
      'import { useState, useEffect } from "react";',
      '',
      'interface UserProps {',
      '  name: string;',
      '  age: number;',
      '}',
      '',
      'export function UserCard({ name, age }: UserProps) {',
      '  const [active, setActive] = useState(false);',
      '  return <div>{name}</div>;',
      '}',
    ].join('\n');

    const result = classifyClipboardText(tsCode);
    expect(result.kind).toBe('code');
    expect(result.detectedLanguage).toBe('typescript');
  });

  it('classifies SQL schema statements correctly', () => {
    const sql = [
      'CREATE TABLE users (',
      '  id SERIAL PRIMARY KEY,',
      '  email VARCHAR(255) UNIQUE NOT NULL,',
      '  created_at TIMESTAMP DEFAULT NOW()',
      ');',
      '',
      'INSERT INTO users (email) VALUES (\'admin@example.com\');',
    ].join('\n');

    const result = classifyClipboardText(sql);
    expect(result.kind).toBe('sql');
    expect(result.detectedLanguage).toBe('sql');
    expect(result.badgeLabel).toContain('SQL');
  });

  it('classifies JSON payloads correctly', () => {
    const json = JSON.stringify({
      id: 42,
      user: { name: 'Alice', role: 'admin' },
      tags: ['typescript', 'react'],
      active: true,
    }, null, 2);

    const result = classifyClipboardText(json);
    expect(result.kind).toBe('json');
    expect(result.detectedLanguage).toBe('json');
    expect(result.badgeLabel).toContain('JSON');
  });

  it('classifies plain English prompts as natural language', () => {
    const english = [
      'Write a function that takes a list of integers and returns the sum',
      'of all even numbers in the list. The function should handle empty',
      'lists gracefully and return zero in that case.',
    ].join(' ');

    const result = classifyClipboardText(english);
    expect(result.kind).toBe('english');
    expect(result.badgeLabel).toContain('Natural Language');
  });

  it('returns english for empty input', () => {
    const result = classifyClipboardText('');
    expect(result.kind).toBe('english');
  });

  it('classifies Rust panics as stack traces', () => {
    const rustPanic = [
      "thread 'main' panicked at 'index out of bounds: the len is 3 but the index is 5'",
      '  at src/main.rs:42:16',
    ].join('\n');

    const result = classifyClipboardText(rustPanic);
    expect(result.kind).toBe('stacktrace');
    expect(result.detectedLanguage).toBe('rust');
  });
});
