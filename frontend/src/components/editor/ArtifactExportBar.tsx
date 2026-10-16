/**
 * ArtifactExportBar — 1-Click Work Artifact Exporter.
 *
 * Compact toolbar above the output panel offering 3 instant client-side
 * actions that consume 0 LLM tokens:
 *  1. Inject Docstrings — splices JSDoc or PEP-257 above each block.
 *  2. Copy as GitHub PR Description — formats blocks into a PR Markdown template.
 *  3. Run AST Binding Audit — shows symbol count badge.
 *
 * v1.2.0 — Daily-Driver Workspace Upgrade
 */
"use client";

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileCode2, ClipboardCopy, SearchCode, Undo2, Check } from 'lucide-react';
import { useTranslationStore } from '@/features/translate/_store/useTranslationStore';
import { extractAstLineRanges } from '@/lib/ast-line-mapper';

interface ArtifactExportBarProps {
  sourceLanguage: string;
}

/** Injects a JSDoc comment above a line in a code array. */
function injectJsDoc(lines: string[], lineIndex: number, docstring: string): void {
  const indent = lines[lineIndex]?.match(/^(\s*)/)?.[1] ?? '';
  const docLines = docstring
    .split('\n')
    .map((l, i, arr) => {
      if (i === 0) return `${indent}/**`;
      if (i === arr.length - 1 && !l.trim()) return `${indent} */`;
      return `${indent} * ${l.trim()}`;
    })
    .filter(Boolean);
  docLines.push(`${indent} */`);
  // Remove the duplicate */ added in filter
  const unique = docLines.filter((l, idx) => !(l.trim() === '*/' && idx < docLines.length - 1));
  lines.splice(lineIndex, 0, ...unique.slice(0, -1), `${indent} */`);
}

/** Injects a PEP-257 docstring on the line after a def/class. */
function injectPythonDocstring(lines: string[], lineIndex: number, docstring: string): void {
  const indent = (lines[lineIndex]?.match(/^(\s*)/)?.[1] ?? '') + '    ';
  const short = docstring.split('\n')[0].trim();
  lines.splice(lineIndex + 1, 0, `${indent}"""${short}"""`);
}

export function ArtifactExportBar({ sourceLanguage }: ArtifactExportBarProps) {
  const blockIds = useTranslationStore((state) => state.blockIds);
  const blocksById = useTranslationStore((state) => state.blocksById);
  const input = useTranslationStore((state) => state.input);
  const setInput = useTranslationStore((state) => state.setInput);

  const [docstringsInjected, setDocstringsInjected] = useState(false);
  const [copied, setCopied] = useState(false);
  const originalCodeRef = useRef<string | null>(null);

  const isPython = sourceLanguage.toLowerCase() === 'python';
  const hasBlocks = blockIds.length > 0;

  // ── 1. Inject Docstrings ──────────────────────────────────────────────────
  const handleInjectDocstrings = useCallback(() => {
    if (!input || !hasBlocks) {
      toast.error('No code or translation blocks available.');
      return;
    }

    const blocks = blockIds
      .map((id) => blocksById[id])
      .filter((b) => b && b.startLine && b.endLine && b.english_translation);

    if (blocks.length === 0) {
      toast.info('No blocks with line ranges available. Run a translation first.');
      return;
    }

    // Save original for undo
    originalCodeRef.current = input;
    const lines = input.split('\n');
    let offset = 0;

    for (const block of blocks) {
      if (!block.startLine || !block.english_translation) continue;
      const insertAt = block.startLine - 1 + offset;
      const docstring = block.english_translation.slice(0, 200);
      const before = lines.length;

      if (isPython) {
        injectPythonDocstring(lines, insertAt, docstring);
      } else {
        injectJsDoc(lines, insertAt, docstring);
      }

      offset += lines.length - before;
    }

    setInput(lines.join('\n'));
    setDocstringsInjected(true);
    toast.success(`Injected ${blocks.length} docstring${blocks.length > 1 ? 's' : ''} into code.`, {
      action: {
        label: 'Undo',
        onClick: () => {
          if (originalCodeRef.current !== null) {
            setInput(originalCodeRef.current);
            setDocstringsInjected(false);
            toast.info('Docstrings removed.');
          }
        },
      },
    });
  }, [blockIds, blocksById, input, setInput, isPython, hasBlocks]);

  // ── Undo Docstrings ───────────────────────────────────────────────────────
  const handleUndoDocstrings = useCallback(() => {
    if (originalCodeRef.current !== null) {
      setInput(originalCodeRef.current);
      setDocstringsInjected(false);
      originalCodeRef.current = null;
      toast.info('Docstrings removed.');
    }
  }, [setInput]);

  // ── 2. Copy as GitHub PR Description ─────────────────────────────────────
  const handleCopyPRMarkdown = useCallback(async () => {
    if (!hasBlocks) {
      toast.error('No translation blocks to export.');
      return;
    }

    const blocks = blockIds.map((id) => blocksById[id]).filter(Boolean);

    const blockSection = blocks
      .map((b, i) => {
        const lineInfo = b.startLine && b.endLine ? ` (Lines ${b.startLine}–${b.endLine})` : '';
        return [
          `### Block ${i + 1}${lineInfo}`,
          '',
          '```',
          (b.code_snippet || '').trim(),
          '```',
          '',
          b.english_translation || '',
        ].join('\n');
      })
      .join('\n\n');

    const totalComplexity = blocks
      .map((b) => {
        const code = b.code_snippet || '';
        const branches = (code.match(/\b(if|else if|elif|for|while|case|catch|except)\b/g) || []).length;
        return 1 + branches;
      })
      .reduce((a, c) => a + c, 0);

    const markdown = [
      '## Summary',
      '',
      `This PR contains ${blocks.length} logical block${blocks.length > 1 ? 's' : ''} of changes across ${sourceLanguage} code.`,
      '',
      '## Block-by-Block Changes',
      '',
      blockSection,
      '',
      '## Complexity & Edge Cases',
      '',
      `- **Total blocks:** ${blocks.length}`,
      `- **Estimated cyclomatic complexity:** ${totalComplexity}`,
      `- **Language:** ${sourceLanguage}`,
      '',
      '_Generated by [Anuvaad](https://getanuvaad.vercel.app) — AI Code Translation Workspace_',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success('GitHub PR description copied to clipboard!');
    } catch {
      toast.error('Could not write to clipboard.');
    }
  }, [blockIds, blocksById, sourceLanguage, hasBlocks]);

  // ── 3. AST Binding Audit ─────────────────────────────────────────────────
  const handleAstAudit = useCallback(() => {
    if (!input || !input.trim()) {
      toast.error('No code to audit.');
      return;
    }

    try {
      const ranges = extractAstLineRanges(input, sourceLanguage);
      const named = ranges.filter((r) => r.name).length;
      const fns = ranges.filter((r) => r.type === 'function').length;
      const classes = ranges.filter((r) => r.type === 'class').length;
      const vars = ranges.filter((r) => r.type === 'variable').length;

      toast.success(
        `AST Audit: ${ranges.length} blocks · ${named} named symbols · ${fns} functions · ${classes} classes · ${vars} variables`,
        { duration: 6000 }
      );
    } catch {
      toast.error('AST audit failed — could not parse code.');
    }
  }, [input, sourceLanguage]);

  if (!hasBlocks) return null;

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/60 bg-muted/30 backdrop-blur-sm"
      aria-label="Work artifact export toolbar"
    >
      <span className="text-[10px] font-mono text-muted-foreground mr-1 hidden sm:inline">
        Export
      </span>

      {/* Inject Docstrings */}
      {docstringsInjected ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndoDocstrings}
          className="h-7 px-2 text-[11px] gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          aria-label="Undo docstring injection"
        >
          <Undo2 className="h-3 w-3" />
          Undo Docstrings
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleInjectDocstrings}
          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Inject docstrings into code"
          title={isPython ? 'Inject PEP-257 docstrings' : 'Inject JSDoc comments'}
        >
          <FileCode2 className="h-3 w-3" />
          {isPython ? 'Inject Docstrings' : 'Inject JSDoc'}
        </Button>
      )}

      <div className="h-4 w-px bg-border/60" />

      {/* Copy as PR Markdown */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyPRMarkdown}
        className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
        aria-label="Copy as GitHub PR description"
        title="Copy formatted GitHub PR description to clipboard"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <ClipboardCopy className="h-3 w-3" />}
        {copied ? 'Copied!' : 'Copy as PR'}
      </Button>

      <div className="h-4 w-px bg-border/60" />

      {/* AST Binding Audit */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAstAudit}
        className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
        aria-label="Run AST binding audit"
        title="Analyze symbols, functions, and class bindings"
      >
        <SearchCode className="h-3 w-3" />
        AST Audit
      </Button>
    </div>
  );
}
