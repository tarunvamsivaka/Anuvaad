/**
 * ANUVAAD DESIGN PRIMITIVES — GlassPanel.tsx
 * Glassmorphism surface. level selects the visual variant.
 * Uses .glass-amber / .glass-dark / .glass-apple utility classes from utilities.css.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassPanelVariants = cva(
  'relative overflow-hidden',
  {
    variants: {
      level: {
        /** Amber-tinted: landing panels, code cards */
        amber: 'glass-amber',
        /** Deep dark: dashboard, auth panels */
        dark:  'glass-dark',
        /** Apple frosted: light-mode, macOS-style */
        apple: 'glass-apple',
      },
      rounded: {
        sm:   'rounded-[var(--radius-sm)]',
        md:   'rounded-[var(--radius-md)]',
        lg:   'rounded-[var(--radius-lg)]',
        xl:   'rounded-[var(--radius-xl)]',
        '2xl': 'rounded-[var(--radius-2xl)]',
        '3xl': 'rounded-[var(--radius-3xl)]',
      },
      bordered: {
        true:  '',  // border already in glass-* classes
        false: 'border-transparent',
      },
      glow: {
        none: '',
        sm:   'shadow-[var(--glow-sm)]',
        md:   'shadow-[var(--glow-md)]',
        lg:   'shadow-[var(--glow-lg)]',
      },
    },
    defaultVariants: {
      level:   'amber',
      rounded: 'xl',
      bordered: true,
      glow:    'none',
    },
  }
);

export interface GlassPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassPanelVariants> {
  as?: React.ElementType;
}

/**
 * GlassPanel — glassmorphism surface primitive
 *
 * @example
 * <GlassPanel level="dark" rounded="2xl" glow="sm" className="p-6">
 *   Dashboard card content
 * </GlassPanel>
 */
const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, level, rounded, bordered, glow, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        data-glass={level}
        className={cn(glassPanelVariants({ level, rounded, bordered, glow }), className)}
        {...props}
      />
    );
  }
);

GlassPanel.displayName = 'GlassPanel';

export { GlassPanel, glassPanelVariants };
