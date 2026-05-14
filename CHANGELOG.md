# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-05-14

### Added
- GitHub Gist Import — paste a public Gist URL to import code directly into the translator workspace.
- Transactional email service via Resend (welcome, subscription confirmation, milestone emails).
- PostHog product analytics integration in the frontend with custom event tracking.
- Sentry error monitoring for both frontend (client, server, edge configs) and backend.
- Upstash Redis caching with automatic LRU memory fallback when Redis is unavailable.
- Translation credits system with one-time Stripe checkout purchase flow.
- `/api/metrics` and `/api/metrics/prometheus` observability endpoints with HTTP Basic Auth.
- Rate limiting middleware (15 requests/minute per IP) backed by Redis.
- File upload endpoint (`/api/upload-file`) with extension-based language detection.
- Forgot password page and auth middleware for protected routes.
- Skeleton loading states for Monaco Editor and dashboard components.
- Workspace context provider for scoping translations to team workspaces.
- SEO: dynamic OpenGraph images, `sitemap.ts`, and structured meta tags.

### Changed
- Updated `.env.example` with proper grouping, [REQUIRED]/[OPTIONAL] labels, and inline documentation.
- Corrected `FRONTEND_URL` default from port 5500 to 3000 (matching Next.js dev server).
- Fixed CI pipeline to use `GROQ_API_KEY` + `DEEPSEEK_API_KEY` instead of non-existent `GEMINI_API_KEY`.
- Cleaned up `.dockerignore` to exclude test artifacts, migration files, and stale references.
- Updated `.gitignore` to exclude `node_modules/`, `.next/`, `test-results/`, and `playwright-report/`.
- README fully rewritten to accurately reflect the Groq + DeepSeek tech stack, all features, and complete API surface.

### Fixed
- README incorrectly stated "Google Gemini 2.5 Flash" — the backend actually uses Groq and DeepSeek models.
- README environment variables table listed `GEMINI_API_KEY` which does not exist in the codebase.
- `.dockerignore` referenced deleted files (`implementation_plan_1`, `walkthrough_1`, `audit_report1`).
- CI Docker health check used wrong environment variable name.

## [1.1.0] - 2026-05-08

### Added
- Supabase migration v4 and v5 for API keys table and enhanced RLS policies.
- Security definer helper function for workspace lookups (resolves RLS infinite recursion).
- Playwright end-to-end test configuration and auth setup.
- Docker Compose service for local Redis.

## [1.0.0] - 2026-05-01

### Added
- Complete FastAPI backend with intelligent LLM routing using Groq (Llama-3.3) and DeepSeek V3/R1.
- Server-Sent Events (SSE) streaming for real-time translation feedback in the UI.
- Next.js frontend built with App Router, shadcn/ui components, and persistent next-themes support.
- Three specialized translation modes: Code → English, English → Code, and Code → Code.
- Supabase Authentication (Google + GitHub OAuth) and robust PostgreSQL integration for user profiles and history.
- Stripe billing portal with automated webhooks, subscription gating, and Pro-tier functionality.
- Team Workspaces for collaborative sharing of translation context and custom coding standards.
- Production-ready Docker multi-stage build orchestration and NGINX reverse proxy configuration.
- Comprehensive suite of 50+ Pytest tests validating core endpoints, cache performance, and AI fallback logic.
- Automated GitHub Actions CI/CD pipeline enforcing parallel backend tests, Python linters, and strict Next.js TypeScript compilation.
