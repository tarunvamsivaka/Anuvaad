# Anuvaad data processing and security notes

**Status:** implementation overview, October 2026

**Audience:** users evaluating how the current web app handles code

This document describes the current application behavior visible in this repository. It is not a certification, penetration-test report, or guarantee about hosting and AI-provider retention. For user-facing terms, see [/privacy](/privacy).

## Code processing

- Translation requests send the code or prompt to the Anuvaad API and to an AI provider selected for the request. Provider routing can vary; each provider has its own data handling terms.
- Translation workspace runs are not written to Anuvaad history or translation cache unless a signed-in user enables “Save runs to my Anuvaad history and translation cache.” Users can delete individual runs or clear all history from the History page.
- A user can explicitly create a share link for a saved translation after reviewing a preview. Links may be configured to expire after 1, 7, or 30 days, or remain active until made private or deleted. Shared content is retrievable by anyone with the link while it is public and unexpired.
- The API recognizes `X-Anuvaad-Privacy-Mode: ephemeral` and skips application-level history and translation-cache writes on supported endpoints. The translation workspace exposes this as an opt-in for translation and sync requests. This does not establish that edge, hosting, provider, or diagnostic logs never retain request data.
- Analytics are configured not to receive source or generated code. Error reports and request metadata still require operational controls and periodic verification.

## Syntax validation

Generated code is validated in memory. Python uses `compile()` without executing the submitted code. Other supported languages use Tree-sitter in a worker thread. If a grammar is unavailable, validation reports that it could not validate the language; it does not treat the output as valid. These checks detect syntax errors only and do not prove compilation, semantic equivalence, correctness, or safety.

## Authentication and database

The application uses Supabase for authentication and PostgreSQL. The project audit on 2026-10-04 observed row-level security enabled on the reviewed public tables. Continue to review access policies whenever schema or sharing behavior changes. Supabase Auth's leaked-password protection was reported disabled during that audit and remains a dashboard configuration item until verified as enabled.

## Deployment

The API is deployed on Render and the web frontend on Vercel. Render free instances can sleep and have resource limits; they are suitable for evaluation, not a production availability commitment. Schema changes must be applied through the reviewed database migration process before deploying code that depends on them.

## Security follow-up

- Verify log redaction and retention across Vercel, Render, Supabase, analytics, and each AI provider.
- Keep credentials in service environment settings and rotate them if exposure is suspected.
- Review authentication, row-level policies, public-share access, rate limits, and deletion behavior after material changes.
- Do not submit secrets or code you are not authorized to share with Anuvaad and its configured AI providers.
