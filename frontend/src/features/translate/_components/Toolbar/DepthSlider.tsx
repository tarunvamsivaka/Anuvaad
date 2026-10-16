/**
 * DepthSlider — 3-Stop Persona Depth Selector.
 *
 * Controls the explanation depth for translation output:
 *  - TL;DR: Single-sentence summary per block
 *  - Dev: Standard developer explanation (default)
 *  - CS Audit: Security & complexity-focused deep dive
 *
 * Stored in useTranslationStore.explanationDepth and persisted
 * in sessionStorage. Passed to /api/code-to-english as `depth`.
 *
 * v1.2.0 — Daily-Driver Workspace Upgrade
 */
"use client";

import { cn } from '@/lib/utils';
import { useTranslationStore } from '../../_store/useTranslationStore';

export type ExplanationDepth = 'tldr' | 'dev' | 'audit';

const DEPTHS: Array<{ id: ExplanationDepth; label: string; title: string }> = [
  { id: 'tldr', label: 'TL;DR', title: 'Quick 1-sentence summary per block' },
  { id: 'dev', label: 'Dev', title: 'Standard developer explanation (default)' },
  { id: 'audit', label: 'CS Audit', title: 'Security & complexity-focused deep dive' },
];

export function DepthSlider() {
  const explanationDepth = useTranslationStore((state) => state.explanationDepth);
  const setExplanationDepth = useTranslationStore((state) => state.setExplanationDepth);

  return (
    <div
      role="group"
      aria-label="Explanation depth"
      className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 gap-0.5"
    >
      {DEPTHS.map((depth) => (
        <button
          key={depth.id}
          type="button"
          onClick={() => setExplanationDepth(depth.id)}
          title={depth.title}
          aria-pressed={explanationDepth === depth.id}
          aria-label={`Set explanation depth to ${depth.label}`}
          className={cn(
            'px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-all duration-150',
            explanationDepth === depth.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
        >
          {depth.label}
        </button>
      ))}
    </div>
  );
}
