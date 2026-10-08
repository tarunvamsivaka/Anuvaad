# ADR-003: Local State vs. Zustand in Landing Components

**Date:** October 2026  
**Status:** Accepted

## Context

During the landing page build, the question arose whether hero preset selection, CLI toolchain toggle, and the copy-to-clipboard states should live in Zustand (the app's global state manager) or component-local `useState`.

## Decision

All landing page state is component-local `useState`. Zustand is used only for:

- **Authentication state** — user session, JWT token, auth loading
- **Translation workspace state** — active job ID, streaming output buffer, selected language pair
- **UI preferences** — theme, command palette visibility, keyboard shortcut modal

## Reasoning

Landing page interactions are ephemeral and non-shared:

- Preset selection affects only the `TerminalPreview` immediately below it
- CLI toolchain toggle has no effect on any other component on the page
- Copy-to-clipboard state resets after 2 seconds regardless of what else happens

Putting these in Zustand would:
1. Create unnecessary render subscriptions across the entire component tree
2. Add debugging overhead (every interaction shows up in Zustand devtools)
3. Require mock store providers in Storybook and unit tests

The cost of lifting state is zero when state genuinely belongs where it lives.

## Consequences

- Each landing section is a self-contained unit, testable without a store provider
- Storybook stories require no mock setup for the `HeroControlBar`, `ActionDeck`, etc.
- If multi-step wizard or A/B test state is needed for the landing page later, reconsider

## References

- [Zustand docs: Flux-inspired state management](https://zustand.docs.pmnd.rs/)
- [React docs: Lifting State Up](https://react.dev/learn/sharing-state-between-components)
