/**
 * ANUVAAD — Button.tsx (Design System V2)
 * Enhanced button over shadcn/ui base — adds amber brand variants,
 * shimmer effect, and optional GSAP magnetic pull.
 *
 * Extends the existing shadcn Button — does NOT replace it.
 * Import this for Anuvaad-branded CTAs. Import ui/button for standard UI.
 */

'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { MagneticButton } from '@/components/motion/MagneticButton';

const anuvaadButtonVariants = cva(
  // Base: shares geometry with shadcn button
  [
    'inline-flex items-center justify-center gap-2',
    'font-semibold whitespace-nowrap select-none',
    'transition-all outline-none',
    'focus-visible:outline-2 focus-visible:outline-[var(--amber-500)] focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** Primary amber shimmer — hero CTAs */
        amber: [
          'btn-amber-shimmer',
          'text-[var(--text-on-brand)]',
          'shadow-[var(--glow-sm)]',
          'hover:shadow-[var(--glow-md)]',
        ],
        /** Amber outline — secondary CTAs */
        'amber-outline': [
          'bg-transparent',
          'border border-[var(--border-active)]',
          'text-[var(--amber-500)]',
          'hover:bg-[rgba(245,158,11,0.08)]',
          'hover:border-[var(--border-focus)]',
        ],
        /** Ghost dark — tertiary actions */
        ghost: [
          'bg-transparent',
          'border border-[var(--border-faint)]',
          'text-[var(--text-secondary)]',
          'hover:bg-[var(--surface-high)]',
          'hover:text-[var(--text-primary)]',
          'hover:border-[var(--border-default)]',
        ],
        /** Danger — destructive actions */
        danger: [
          'bg-[rgba(239,68,68,0.12)]',
          'border border-[rgba(239,68,68,0.25)]',
          'text-[var(--status-danger)]',
          'hover:bg-[rgba(239,68,68,0.20)]',
        ],
      },
      size: {
        sm:   'h-8  px-3   text-[var(--text-sm)]  rounded-[var(--radius-lg)]',
        md:   'h-10 px-5   text-[var(--text-base)] rounded-[var(--radius-xl)]',
        lg:   'h-12 px-7   text-[var(--text-md)]  rounded-[var(--radius-xl)]',
        xl:   'h-14 px-10  text-[var(--text-lg)]  rounded-[var(--radius-2xl)]',
        icon: 'h-10 w-10   rounded-[var(--radius-xl)]',
      },
      magnetic: {
        true:  '',  // magnetic handled by MagneticButton wrapper
        false: '',
      },
    },
    defaultVariants: {
      variant:  'amber',
      size:     'md',
      magnetic: false,
    },
  }
);

export interface AnuvaadButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof anuvaadButtonVariants> {
  /** Wrap in MagneticButton (spring pull on hover) — use for hero CTAs only */
  magnetic?: boolean;
  asChild?: boolean;
}

/**
 * Button (Design System V2)
 * Anuvaad-branded button with amber variants.
 *
 * @example
 * <Button variant="amber" size="lg" magnetic>Try Free →</Button>
 * <Button variant="amber-outline" size="md">See the Story</Button>
 * <Button variant="ghost">Cancel</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, AnuvaadButtonProps>(
  ({ className, variant, size, magnetic, children, ...props }, ref) => {
    const buttonClass = cn(anuvaadButtonVariants({ variant, size }), className);

    if (magnetic) {
      return (
        <MagneticButton
          className={buttonClass}
          {...props}
        >
          {children}
        </MagneticButton>
      );
    }

    return (
      <button
        ref={ref}
        className={buttonClass}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, anuvaadButtonVariants };
