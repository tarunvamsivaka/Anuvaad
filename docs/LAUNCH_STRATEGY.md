# Anuvaad Launch Strategy

**Planning horizon:** next 90 days
**Audience:** anyone who needs to understand code in any programming language, especially students, developers working in unfamiliar repositories, and independent builders working with generated projects.

## Product promise

Paste or upload a code snippet, choose **Explain code**, and receive a clear block-by-block explanation beside the original. Users can translate code or generate a starting point when those workflows better fit their task.

Syntax validation is presented honestly as a parser check, never as proof that generated code works correctly.

## Priorities

| Priority | Outcome | Evidence required before advancing |
| --- | --- | --- |
| P0: Trustworthy core | Explain, translate, and upload flows are safe, understandable, and usable | Backend/frontend verification, migration gate, privacy review, and synthetic smoke test |
| P1: First-use success | A new user can explain a snippet without assistance | Moderated sessions with students, developers, and independent builders; at least 70% complete the task unaided |
| P2: Repeat value | Users return because explanations help them work | Four weeks of consented, metadata-only activation and usefulness signals |
| P3: Sustainable service | Capacity and support remain within free-tier limits | Provider quota, failure, latency, and retention evidence; no hidden paid dependency |

## 90-day sequence

### Days 1–14: launch readiness

- Restore a Python verification environment and run the complete backend test, lint, formatting, and migration tracks.
- Resolve the current dirty-tree quality findings before merging: trailing whitespace and a review of the existing large change set.
- Reconcile every public claim against code and verified service settings, especially privacy, history, supported languages, and repository features.
- Select a launch language matrix based on representative end-to-end quality checks. Do not market all parser-installed languages as equally supported.
- Prepare an operator record for releases: commit, migration revision, smoke results, rollback owner, and incident link. Keep source code out of it.

### Days 15–45: controlled first users

- Invite a small opt-in cohort: [FILL: cohort recruitment source].
- Ask users to complete one real code-understanding task, then capture usefulness as useful, incorrect, or unsupported without collecting code.
- Fix repeated onboarding, accessibility, parser-status, and recovery failures before adding features.
- Publish one short help page explaining what Anuvaad checks, what it does not check, and how code processing and history settings work.

### Days 46–90: repeatability decision

- Review activation, useful-result rate, return usage, validation rejection, provider fallback, and free-tier quota pressure every two weeks.
- Narrow the language matrix or quota if quality or capacity falls below the declared guardrails.
- Add repository exploration only after the current repository-context workflow can reliably load and explain files with clear access boundaries.
- Consider a paid plan only after users demonstrate repeat value and the product has approved support, refund, tax, and pricing policies.

## Service model

| User state | Service provided | Data rule |
| --- | --- | --- |
| Guest | A bounded code-understanding attempt with explicit cloud consent | Ephemeral request; do not retain source code in application history or cache |
| Signed-in user | Higher limits and optional account-linked features | History requires explicit opt-in and encrypted storage |
| Repository user | Repository and file-path context when connected | Request only the minimum access needed; never imply repository browsing or write-back unless it is implemented and tested |

## Operating scorecard

- **User value:** weekly users who receive a result and mark it useful.
- **Activation:** visitors who complete their first explanation.
- **Quality:** useful/incorrect/unsupported feedback, parser failures, and sampled review of the launch language matrix.
- **Trust:** privacy-related support reports, history deletion success, and share revocation success.
- **Reliability:** request success, p95 latency, fallback rate, and quota rejection rate.
- **Cost:** provider quota use and any non-free service dependency. Stop or reduce scope before a paid commitment is required.

## Decision rule

When priorities conflict, choose in this order: user privacy and safety, correctness of product claims, reliable code-understanding flow, zero-budget feasibility, then feature breadth.
