/**
 * ANUVAAD DESIGN PRIMITIVES — Surface.tsx
 * Semantic background wrapper. level prop maps to design token surfaces.
 * All color values come from token variables — no hardcoded hex.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const surfaceVariants = cva(
  // Base: relative for overlay children
  'relative',
  {
    variants: {
      level: {
        /** --surface-base: #030014 — deepest, WebGL canvas layer */
        base:     'bg-[var(--surface-base)]',
        /** --surface-low: #080c14 — page background */
        low:      'bg-[var(--surface-low)]',
        /** --surface-mid: #0c0f1a — panels, sidebar */
        mid:      'bg-[var(--surface-mid)]',
        /** --surface-high: #111520 — cards */
        high:     'bg-[var(--surface-high)]',
        /** --surface-overlay: #161b28 — elevated cards, modals */
        elevated: 'bg-[var(--surface-overlay)]',
      },
      rounded: {
        none: 'rounded-none',
        sm:   'rounded-[var(--radius-sm)]',
        md:   'rounded-[var(--radius-md)]',
        lg:   'rounded-[var(--radius-lg)]',
        xl:   'rounded-[var(--radius-xl)]',
        '2xl': 'rounded-[var(--radius-2xl)]',
      },
    },
    defaultVariants: {
      level: 'mid',
      rounded: 'none',
    },
  }
);

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {
  as?: React.ElementType;
}

/**
 * Surface — semantic background wrapper
 *
 * @example
 * <Surface level="high" rounded="xl" className="p-4">
 *   Card content
 * </Surface>
 */
const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, level, rounded, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        data-surface={level}
        className={cn(surfaceVariants({ level, rounded }), className)}
        {...props}
      />
    );
  }
);

Surface.displayName = 'Surface';

export { Surface, surfaceVariants };
