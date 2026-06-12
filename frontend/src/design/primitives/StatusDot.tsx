/**
 * ANUVAAD DESIGN PRIMITIVES — StatusDot.tsx
 * Animated online/offline presence indicator.
 * Uses .status-dot / .status-active utility classes from components.css.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusDotVariants = cva(
  'status-dot',
  {
    variants: {
      status: {
        /** Green pulse — online, connected, active */
        active:   'status-active text-[var(--status-success)]',
        /** Amber — pending, processing, warning */
        pending:  'text-[var(--status-warning)]',
        /** Red — error, offline, danger */
        error:    'text-[var(--status-danger)]',
        /** Gray — inactive, unknown */
        inactive: 'text-[var(--text-muted)]',
      },
      size: {
        sm: '[&::before]:w-1.5 [&::before]:h-1.5',
        md: '[&::before]:w-2 [&::before]:h-2',
        lg: '[&::before]:w-3 [&::before]:h-3',
      },
    },
    defaultVariants: {
      status: 'active',
      size:   'sm',
    },
  }
);

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {
  /** Screen-reader label */
  label?: string;
}

/**
 * StatusDot — animated presence indicator
 *
 * @example
 * <StatusDot status="active" label="Online" />
 * <StatusDot status="pending" size="lg" label="Processing" />
 */
const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ className, status, size, label, ...props }, ref) => {
    return (
      <span
        ref={ref}
        role="img"
        aria-label={label ?? status ?? 'status'}
        data-status={status}
        className={cn(statusDotVariants({ status, size }), className)}
        {...props}
      />
    );
  }
);

StatusDot.displayName = 'StatusDot';

export { StatusDot, statusDotVariants };
