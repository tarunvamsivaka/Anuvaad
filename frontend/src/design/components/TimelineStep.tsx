/**
 * ANUVAAD — TimelineStep.tsx (Design System V2)
 * Onboarding flow step indicator with progress tracking.
 * Used in the onboarding stepper (E2.5).
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ── Step state variants ──────────────────────────────────────

const stepIndicatorVariants = cva(
  'relative flex items-center justify-center rounded-full font-semibold text-sm transition-all duration-[var(--dur-normal)] shrink-0',
  {
    variants: {
      state: {
        complete: [
          'w-8 h-8',
          'bg-[var(--amber-500)]',
          'text-[var(--text-on-brand)]',
          'shadow-[var(--glow-sm)]',
        ],
        current: [
          'w-8 h-8',
          'bg-[var(--surface-overlay)]',
          'text-[var(--amber-500)]',
          'border-2 border-[var(--border-active)]',
          'shadow-[var(--glow-xs)]',
        ],
        upcoming: [
          'w-8 h-8',
          'bg-[var(--surface-mid)]',
          'text-[var(--text-muted)]',
          'border border-[var(--border-faint)]',
        ],
      },
    },
    defaultVariants: { state: 'upcoming' },
  }
);

// ── Connector line ────────────────────────────────────────────

const stepConnectorVariants = cva(
  'flex-1 h-px mx-3 transition-all duration-[var(--dur-slower)]',
  {
    variants: {
      filled: {
        true:  'bg-[var(--amber-500)] opacity-60',
        false: 'bg-[var(--border-faint)]',
      },
    },
    defaultVariants: { filled: false },
  }
);

// ── Types ─────────────────────────────────────────────────────

export type StepState = 'complete' | 'current' | 'upcoming';

export interface Step {
  label: string;
  description?: string;
}

export interface TimelineStepProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  /** 0-indexed current step */
  currentStep: number;
  /** Vertical or horizontal layout */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * TimelineStep — onboarding step indicator
 *
 * @example
 * <TimelineStep
 *   steps={[
 *     { label: 'Demo', description: 'See Anuvaad in action' },
 *     { label: 'Modes', description: 'Pick your use case' },
 *     { label: 'Launch', description: "You're ready!" },
 *   ]}
 *   currentStep={1}
 * />
 */
export function TimelineStep({
  steps,
  currentStep,
  orientation = 'horizontal',
  className,
  ...props
}: TimelineStepProps) {
  const getState = (index: number): StepState => {
    if (index < currentStep) return 'complete';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  if (orientation === 'horizontal') {
    return (
      <div
        role="list"
        aria-label="Progress steps"
        className={cn('flex items-center w-full', className)}
        {...props}
      >
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            {/* Step indicator */}
            <div
              role="listitem"
              aria-current={i === currentStep ? 'step' : undefined}
              aria-label={`Step ${i + 1}: ${step.label} — ${getState(i)}`}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={cn(stepIndicatorVariants({ state: getState(i) }))}>
                {getState(i) === 'complete' ? (
                  // Checkmark
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span aria-hidden="true">{i + 1}</span>
                )}
              </div>
              <span className={cn(
                'text-[var(--text-xs)] font-medium hidden sm:block',
                getState(i) === 'current'   ? 'text-[var(--text-primary)]'   : '',
                getState(i) === 'complete'  ? 'text-[var(--amber-500)]'      : '',
                getState(i) === 'upcoming'  ? 'text-[var(--text-muted)]'     : '',
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector line between steps */}
            {i < steps.length - 1 && (
              <div
                aria-hidden="true"
                className={cn(stepConnectorVariants({ filled: i < currentStep }))}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Vertical orientation
  return (
    <ol
      aria-label="Progress steps"
      className={cn('flex flex-col gap-0', className)}
      {...(props as React.OlHTMLAttributes<HTMLOListElement>)}
    >
      {steps.map((step, i) => (
        <li key={step.label} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={cn(stepIndicatorVariants({ state: getState(i) }))}>
              {getState(i) === 'complete' ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <span aria-hidden="true">{i + 1}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                aria-hidden="true"
                className={cn(
                  'w-px flex-1 mt-2 mb-2 transition-all duration-[var(--dur-slower)]',
                  i < currentStep ? 'bg-[var(--amber-500)] opacity-60' : 'bg-[var(--border-faint)]'
                )}
              />
            )}
          </div>
          <div className="pb-6">
            <p className={cn(
              'font-semibold text-[var(--text-sm)]',
              getState(i) === 'current'  ? 'text-[var(--text-primary)]' : '',
              getState(i) === 'complete' ? 'text-[var(--amber-500)]'    : '',
              getState(i) === 'upcoming' ? 'text-[var(--text-muted)]'   : '',
            )}>
              {step.label}
            </p>
            {step.description && (
              <p className="text-[var(--text-xs)] text-[var(--text-muted)] mt-0.5">
                {step.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

TimelineStep.displayName = 'TimelineStep';
