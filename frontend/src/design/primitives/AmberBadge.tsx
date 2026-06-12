/**
 * ANUVAAD DESIGN PRIMITIVES — AmberBadge.tsx
 * Amber pill badge for plan status, mode labels, feature tags.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const amberBadgeVariants = cva(
  // Base: pill shape, monospace-optional, no wrapping
  'inline-flex items-center gap-1 whitespace-nowrap font-medium select-none',
  {
    variants: {
      variant: {
        /** Solid amber fill — most popular, primary status */
        solid: [
          'bg-[var(--amber-500)]',
          'text-[var(--text-on-brand)]',
          'border border-[var(--amber-600)]',
        ],
        /** Amber outline — secondary status */
        outline: [
          'bg-transparent',
          'text-[var(--amber-500)]',
          'border border-[var(--border-active)]',
        ],
        /** Subtle amber tint — informational */
        subtle: [
          'bg-[rgba(245,158,11,0.12)]',
          'text-[var(--amber-400)]',
          'border border-[var(--border-default)]',
        ],
        /** Ghost — almost invisible */
        ghost: [
          'bg-transparent',
          'text-[var(--text-secondary)]',
          'border border-[var(--border-faint)]',
        ],
      },
      size: {
        sm: 'rounded-[var(--radius-full)] px-2 py-0.5 text-[var(--text-2xs)]',
        md: 'rounded-[var(--radius-full)] px-2.5 py-1 text-[var(--text-xs)]',
        lg: 'rounded-[var(--radius-full)] px-3 py-1 text-[var(--text-sm)]',
      },
      glow: {
        true:  'shadow-[var(--glow-xs)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'subtle',
      size:    'md',
      glow:    false,
    },
  }
);

export interface AmberBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof amberBadgeVariants> {
  /** Optional leading dot indicator */
  dot?: boolean;
}

/**
 * AmberBadge — pill badge for plan status, mode labels, tags
 *
 * @example
 * <AmberBadge variant="solid" glow>Most Popular</AmberBadge>
 * <AmberBadge variant="outline" dot>Pro Plan</AmberBadge>
 * <AmberBadge variant="subtle" size="sm">Python</AmberBadge>
 */
const AmberBadge = React.forwardRef<HTMLSpanElement, AmberBadgeProps>(
  ({ className, variant, size, glow, dot, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        data-badge
        className={cn(amberBadgeVariants({ variant, size, glow }), className)}
        {...props}
      >
        {dot && (
          <span
            aria-hidden="true"
            className="block w-1.5 h-1.5 rounded-full bg-current"
          />
        )}
        {children}
      </span>
    );
  }
);

AmberBadge.displayName = 'AmberBadge';

export { AmberBadge, amberBadgeVariants };
