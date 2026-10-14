# Consumer Product Validation Plan

This plan operationalizes the research and evidence gates in `CONSUMER_PRODUCT_DEVELOPMENT_STRATEGY.md`. It is a protocol and blank scorecard, not evidence that participants have been recruited or that any result has passed.

## Phase 1 moderated usability sessions

### Participants

Recruit 8–12 people across these groups, aiming for at least two from each:

- Developers who recently joined an unfamiliar codebase.
- Students or self-taught programmers learning a language or concept.
- Independent builders who regularly switch programming languages.

Do not recruit only from the project team. Record role and experience band, not employer, repository, or source code.

### Consent and data handling

Before the session, explain that participants will use a research build and that generated output can be wrong. Ask them to use only public, synthetic, or non-sensitive snippets. Do not record screen/audio by default. Do not collect raw prompts, source code, generated code, email, or repository identifiers in the scorecard. Participation is voluntary and can stop at any time.

### Tasks

1. Explain a short unfamiliar function and describe its behavior in their own words.
2. Translate a small snippet between a selected language pair, inspect the syntax-check note, and identify one thing they would verify before using it.
3. Find the privacy setting, explain what it changes and what it does not change, then locate saved history and delete one item.
4. Give one-click result feedback and explain what they expected would happen to that feedback.

Use task prompts that do not disclose the intended navigation path. Do not coach during the task; offer help only after recording an unassisted completion or failure.

### Per-participant scorecard

| Field | Record |
|---|---|
| Participant code | Anonymous ID such as P01 |
| User group / experience band | Broad category only |
| Task | 1–4 |
| Completed without help | Yes / No |
| Critical misunderstanding | Short paraphrase; no code or personal data |
| Time to first usable result | Seconds, when measurable |
| Output reaction | Useful / Incorrect / Unsupported / No rating |
| Observer notes | Behavior and friction, not raw input/output |

### Phase 1 exit gate

- At least 70% of participants complete the core explain/translate task without help.
- Repeated misunderstandings are grouped by root cause; fix any trust/privacy misunderstanding observed in two or more sessions before inviting a broader cohort.
- Report denominators and participant mix. Do not convert this small convenience sample into a population claim.

## Initial language-pair quality review

Start with the candidate pairs named in the strategy: Python, TypeScript/JavaScript, Go, and Rust. The shortlist is provisional until review; grammar availability alone does not qualify a pair.

For each candidate, prepare at least five synthetic snippets spanning basic control flow, functions/types, error handling, and one idiomatic or edge case. Have a reviewer who did not author the prompt rate the generated result:

| Case | Source → target | Syntax parser available | Output parses | Meaning preserved | Useful without repair | Failure class / note |
|---|---|---|---|---|---|---|
| L01 |  |  |  |  |  |  |

Use `Pass`, `Fail`, or `Not applicable`; attach no private code. A pair is not launch-qualified while a critical failure class is unexplained or the review sample is incomplete. Publish the sample size and method, not an accuracy percentage from this small set.

## Phase 2 operating review

Review weekly after a cohort is active and summarize every two weeks:

- Activation: first request started and first result completed, using consented analytics only.
- Quality: feedback counts by mode/language, parser availability, syntax-validation failures, and sampled expert review.
- Repeat use: week-one and week-four return among activated users.
- Reliability: successful requests, provider fallback/error rate, p95 latency, rate-limit rejection, and memory/database connection health.
- Trust and cost: privacy-setting comprehension/issues, estimated inference cost per successful result, provider concentration, and spend cap status.

Define numeric service objectives, provider stop conditions, and the cost ceiling with the product owner before using these measures as launch gates. Never log code or prompt contents to create a metric.

## Phase 3 business validation

Before enabling paid checkout, run willingness-to-pay interviews and a clearly labeled pricing concept test. Collect stated interest separately from actual purchase intent. Only proceed to a small paid pilot after the product owner approves pricing, refund handling, support coverage, tax/receipt behavior, provider cost cap, and a rollback/disable path. Revenue, paid retention, refunds, and gross margin cannot be claimed until at least two real billing cycles have completed.

## Phase 4 expansion gate

Do not add languages, a mobile companion, repository indexing, or a new client surface solely because it is technically feasible. Require evidence of repeat consumer value, a named owner, measurable maintenance and service cost, and a quality review of the affected language pairs before scheduling expansion.
