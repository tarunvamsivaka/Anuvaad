# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
