/**
 * ANUVAAD DESIGN PRIMITIVES — CodeSurface.tsx
 * Dark monospace terminal panel — .terminal-panel utility class.
 * Used as the code block surface in translate page block cards,
 * live demo, and repository storytelling sections.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const codeSurfaceVariants = cva(
  'terminal-panel relative overflow-hidden',
  {
    variants: {
      rounded: {
        none: 'rounded-none',
        sm:   'rounded-[var(--radius-sm)]',
        md:   'rounded-[var(--radius-md)]',
        lg:   'rounded-[var(--radius-lg)]',
        xl:   'rounded-[var(--radius-xl)]',
      },
      padding: {
        none: 'p-0',
        sm:   'p-3',
        md:   'p-4',
        lg:   'p-6',
      },
      /** Scan-line animation overlay — active during streaming */
      scanning: {
        true:  '',
        false: '',
      },
    },
    defaultVariants: {
      rounded:  'lg',
      padding:  'md',
      scanning: false,
    },
  }
);

export interface CodeSurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof codeSurfaceVariants> {
  /** Language label shown in top-right corner */
  language?: string;
  /** Whether to show the scan-line animation overlay */
  scanning?: boolean;
}

/**
 * CodeSurface — monospace terminal-style code panel
 *
 * @example
 * <CodeSurface language="python" className="text-sm">
 *   <pre><code>{code}</code></pre>
 * </CodeSurface>
 *
 * @example
 * // During SSE streaming:
 * <CodeSurface scanning>
 *   <StreamingOutput />
 * </CodeSurface>
 */
const CodeSurface = React.forwardRef<HTMLDivElement, CodeSurfaceProps>(
  ({ className, rounded, padding, scanning, language, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-code-surface
        className={cn(
          codeSurfaceVariants({ rounded, padding, scanning }),
          className
        )}
        {...props}
      >
        {/* Language badge */}
        {language && (
          <span className="
            absolute top-2 right-3
            text-[var(--text-muted)]
            text-[var(--text-xs)]
            font-[var(--font-mono)]
            select-none
            pointer-events-none
          ">
            {language}
          </span>
        )}

        {/* Scan-line overlay — shown during streaming */}
        {scanning && (
          <div
            aria-hidden="true"
            className="scan-line-anim"
          />
        )}

        {children}
      </div>
    );
  }
);

CodeSurface.displayName = 'CodeSurface';

export { CodeSurface, codeSurfaceVariants };
