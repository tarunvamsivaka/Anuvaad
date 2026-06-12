/**
 * ANUVAAD — Card.tsx (Design System V2)
 * Premium dark card with token-based shadows and optional glow.
 * Builds on the .premium-card utility class.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'premium-card flex flex-col overflow-hidden',
  {
    variants: {
      rounded: {
        md:   'rounded-[var(--radius-md)]',
        lg:   'rounded-[var(--radius-lg)]',
        xl:   'rounded-[var(--radius-xl)]',
        '2xl': 'rounded-[var(--radius-2xl)]',
      },
      padding: {
        none: 'p-0',
        sm:   'p-3',
        md:   'p-4',
        lg:   'p-6',
        xl:   'p-8',
      },
      interactive: {
        true: 'cursor-pointer hover:border-[var(--border-active)] transition-[border-color,box-shadow] duration-[var(--dur-normal)]',
        false: '',
      },
    },
    defaultVariants: {
      rounded:     'xl',
      padding:     'md',
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, rounded, padding, interactive, ...props }, ref) => (
    <div
      ref={ref}
      data-card
      className={cn(cardVariants({ rounded, padding, interactive }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

// ── Sub-components ──

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1 pb-3 border-b border-[var(--border-faint)]', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'text-[var(--text-primary)] font-semibold text-[var(--text-base)] leading-[var(--leading-snug)]',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-[var(--text-secondary)] text-[var(--text-sm)]', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center pt-3 mt-auto border-t border-[var(--border-faint)]',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
