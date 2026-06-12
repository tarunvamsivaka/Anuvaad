/**
 * ANUVAAD — CommandSurface.tsx (Design System V2)
 * Premium command palette surface with dark glass styling.
 * Used for the CommandPalette component and any keyboard-driven overlay.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/design/primitives/GlassPanel';

export interface CommandSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width preset */
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Show the top search row */
  showSearch?: boolean;
  /** Slot for the search input */
  searchSlot?: React.ReactNode;
  /** Slot for the command list content */
  children: React.ReactNode;
  /** Slot for the footer (keyboard hints) */
  footer?: React.ReactNode;
}

const widthClasses = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  full: 'w-full',
};

/**
 * CommandSurface — premium dark glass command palette container
 *
 * @example
 * <CommandSurface
 *   width="lg"
 *   showSearch
 *   searchSlot={<Input placeholder="Search commands..." />}
 *   footer={<CommandHints />}
 * >
 *   <CommandGroup />
 * </CommandSurface>
 */
export function CommandSurface({
  width = 'lg',
  showSearch = true,
  searchSlot,
  children,
  footer,
  className,
  ...props
}: CommandSurfaceProps) {
  return (
    <GlassPanel
      level="dark"
      rounded="2xl"
      glow="sm"
      className={cn(
        'w-full overflow-hidden',
        widthClasses[width],
        // Override glass-dark for slightly lighter command surface
        '!bg-[rgba(10,13,20,0.95)]',
        className
      )}
      {...props}
    >
      {/* Search row */}
      {showSearch && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-faint)]">
          {/* Search icon */}
          <svg
            aria-hidden="true"
            className="w-4 h-4 text-[var(--text-muted)] shrink-0"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {searchSlot ?? (
            <span className="text-[var(--text-muted)] text-[var(--text-sm)]">
              Search commands…
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div
        className="max-h-[60vh] overflow-y-auto overscroll-contain p-2"
        role="listbox"
        aria-label="Command palette options"
      >
        {children}
      </div>

      {/* Footer — keyboard hints */}
      {footer && (
        <div className="px-4 py-2 border-t border-[var(--border-faint)] flex items-center gap-4">
          {footer}
        </div>
      )}
    </GlassPanel>
  );
}

// ── Sub-components ──────────────────────────────────────────

export interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  icon?: React.ReactNode;
  shortcut?: string;
}

/**
 * CommandItem — single option row inside CommandSurface
 */
export function CommandItem({
  selected,
  icon,
  shortcut,
  children,
  className,
  ...props
}: CommandItemProps) {
  return (
    <div
      role="option"
      aria-selected={selected}
      data-selected={selected}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-lg)]',
        'text-[var(--text-sm)] cursor-pointer select-none',
        'transition-colors duration-[var(--dur-fast)]',
        selected
          ? 'bg-[rgba(245,158,11,0.10)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-high)] hover:text-[var(--text-primary)]',
        className
      )}
      {...props}
    >
      {icon && (
        <span className="w-4 h-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
      {shortcut && (
        <kbd className="
          text-[var(--text-2xs)] text-[var(--text-muted)]
          bg-[var(--surface-high)] border border-[var(--border-faint)]
          rounded-[var(--radius-sm)] px-1.5 py-0.5
          font-mono
        ">
          {shortcut}
        </kbd>
      )}
    </div>
  );
}

CommandSurface.displayName = 'CommandSurface';
CommandItem.displayName = 'CommandItem';
