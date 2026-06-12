/**
 * ANUVAAD DESIGN PRIMITIVES — GlowBorder.tsx
 * Animated amber box-shadow border wrapper.
 * Wraps any child element in a container with the glow-border utility.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glowBorderVariants = cva(
  'relative transition-shadow duration-[var(--dur-normal)]',
  {
    variants: {
      intensity: {
        /** Subtle — resting state, most surfaces */
        subtle: 'border border-[var(--border-medium)] shadow-[var(--glow-xs)] hover:border-[var(--border-active)] hover:shadow-[var(--glow-sm)]',
        /** Default — interactive surfaces */
        default: 'glow-border',
        /** Strong — featured elements */
        strong: 'border border-[var(--border-active)] shadow-[var(--glow-md)] hover:shadow-[var(--glow-lg)]',
      },
      pulse: {
        /** Animated pulse — status indicators, active state */
        true: '[animation:border-glow_2s_ease-in-out_infinite]',
        false: '',
      },
      rounded: {
        sm:  'rounded-[var(--radius-sm)]',
        md:  'rounded-[var(--radius-md)]',
        lg:  'rounded-[var(--radius-lg)]',
        xl:  'rounded-[var(--radius-xl)]',
        '2xl': 'rounded-[var(--radius-2xl)]',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      intensity: 'default',
      pulse:     false,
      rounded:   'lg',
    },
  }
);

export interface GlowBorderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glowBorderVariants> {
  as?: React.ElementType;
}

/**
 * GlowBorder — amber box-shadow border wrapper
 *
 * @example
 * <GlowBorder intensity="strong" rounded="xl" className="p-4">
 *   Featured card
 * </GlowBorder>
 *
 * @example
 * <GlowBorder pulse rounded="full" className="w-8 h-8">
 *   <StatusIndicator />
 * </GlowBorder>
 */
const GlowBorder = React.forwardRef<HTMLDivElement, GlowBorderProps>(
  ({ className, intensity, pulse, rounded, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(glowBorderVariants({ intensity, pulse, rounded }), className)}
        {...props}
      />
    );
  }
);

GlowBorder.displayName = 'GlowBorder';

export { GlowBorder, glowBorderVariants };
