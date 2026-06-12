/**
 * ANUVAAD — CodeCard.tsx (Design System V2)
 * Translation block card: CodeSurface top + amber rule + TypographyProse bottom.
 * Used in translate output, live demo, and repository storytelling.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CodeSurface } from '@/design/primitives/CodeSurface';
import { TypographyProse } from '@/design/primitives/TypographyProse';
import { AmberBadge } from '@/design/primitives/AmberBadge';

export interface CodeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The code content */
  code: React.ReactNode;
  /** The English translation */
  translation?: React.ReactNode;
  /** Programming language for syntax label */
  language?: string;
  /** Block number (1-indexed) */
  blockIndex?: number;
  /** Whether streaming scan-line is active */
  scanning?: boolean;
  /** Whether translation is still loading */
  pending?: boolean;
  /** Slot for action buttons (copy, edit, etc.) */
  actions?: React.ReactNode;
}

/**
 * CodeCard — translation block card (code + English output)
 *
 * @example
 * <CodeCard
 *   code={<pre><code>{pythonCode}</code></pre>}
 *   translation="This function calculates fibonacci numbers recursively."
 *   language="python"
 *   blockIndex={1}
 * />
 */
export function CodeCard({
  code,
  translation,
  language,
  blockIndex,
  scanning = false,
  pending = false,
  actions,
  className,
  ...props
}: CodeCardProps) {
  return (
    <article
      data-code-card
      aria-label={blockIndex ? `Translation block ${blockIndex}` : 'Translation block'}
      className={cn(
        'premium-card overflow-hidden rounded-[var(--radius-xl)]',
        className
      )}
      {...props}
    >
      {/* ── CODE SURFACE ─────────────────────────────────────── */}
      <CodeSurface
        language={language}
        scanning={scanning}
        rounded="none"
        className="rounded-t-[var(--radius-xl)]"
      >
        {/* Block index badge */}
        {blockIndex !== undefined && (
          <div className="flex items-center justify-between mb-2 px-1">
            <AmberBadge variant="ghost" size="sm">
              Block {blockIndex}
            </AmberBadge>
          </div>
        )}
        {code}
      </CodeSurface>

      {/* ── AMBER DIVIDER ─────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-transparent via-[var(--amber-500)] to-transparent opacity-30"
      />

      {/* ── ENGLISH OUTPUT ────────────────────────────────────── */}
      <div className="p-4 bg-[var(--surface-card)]">
        {pending ? (
          <div className="space-y-2">
            <div className="shimmer-loading h-4 rounded-[var(--radius-sm)] w-3/4" />
            <div className="shimmer-loading h-4 rounded-[var(--radius-sm)] w-1/2" />
          </div>
        ) : translation ? (
          <TypographyProse size="sm" textColor="secondary">
            {translation}
          </TypographyProse>
        ) : null}

        {/* Actions slot */}
        {actions && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-faint)]">
            {actions}
          </div>
        )}
      </div>
    </article>
  );
}

CodeCard.displayName = 'CodeCard';
