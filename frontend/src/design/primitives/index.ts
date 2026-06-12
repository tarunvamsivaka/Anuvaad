/**
 * ANUVAAD DESIGN PRIMITIVES — index.ts
 * Barrel export for all 7 design primitives.
 * Import from '@/design/primitives' in feature components.
 */

export { Surface, surfaceVariants }            from './Surface';
export type { SurfaceProps }                   from './Surface';

export { GlassPanel, glassPanelVariants }      from './GlassPanel';
export type { GlassPanelProps }                from './GlassPanel';

export { GlowBorder, glowBorderVariants }      from './GlowBorder';
export type { GlowBorderProps }                from './GlowBorder';

export { CodeSurface, codeSurfaceVariants }    from './CodeSurface';
export type { CodeSurfaceProps }               from './CodeSurface';

export { AmberBadge, amberBadgeVariants }      from './AmberBadge';
export type { AmberBadgeProps }                from './AmberBadge';

export { StatusDot, statusDotVariants }        from './StatusDot';
export type { StatusDotProps }                 from './StatusDot';

export { TypographyProse, typographyProseVariants } from './TypographyProse';
export type { TypographyProseProps }           from './TypographyProse';
