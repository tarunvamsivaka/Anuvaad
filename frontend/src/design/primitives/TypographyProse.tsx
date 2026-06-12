/**
 * ANUVAAD DESIGN PRIMITIVES — TypographyProse.tsx
 * Lora italic wrapper for English translation output.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const typographyProseVariants = cva(
  'font-[var(--font-prose)] italic leading-[var(--leading-relaxed)]',
  {
    variants: {
      size: {
        sm:   'text-[var(--text-sm)]',
        base: 'text-[var(--text-base)]',
        md:   'text-[var(--text-md)]',
        lg:   'text-[var(--text-lg)]',
      },
      textColor: {
        primary:   'text-[var(--text-primary)]',
        secondary: 'text-[var(--text-secondary)]',
        amber:     'text-[var(--text-amber)]',
      },
      measure: {
        tight:   'max-w-[45ch]',
        default: 'max-w-[65ch]',
        wide:    'max-w-[80ch]',
        full:    'max-w-none',
      },
    },
    defaultVariants: {
      size:      'base',
      textColor: 'primary',
      measure:   'full',
    },
  }
);

export interface TypographyProseProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof typographyProseVariants> {
  as?: 'p' | 'div' | 'span';
}

/**
 * TypographyProse — Lora italic wrapper for English translation output
 *
 * @example
 * <TypographyProse textColor="secondary" size="sm">
 *   This function calculates fibonacci numbers recursively.
 * </TypographyProse>
 */
export function TypographyProse({
  className,
  size,
  textColor,
  measure,
  as: Component = 'p',
  ...props
}: TypographyProseProps) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Component
      data-prose
      className={cn(
        typographyProseVariants({ size, textColor, measure }),
        className
      )}
      {...(props as any)}
    />
  );
}

TypographyProse.displayName = 'TypographyProse';

export { typographyProseVariants };
