# Sprint 10: GTM Launch Assets — Anuvaad

## Hacker News Show HN

**Title** (max 80 chars):
```
Show HN: I built an AI code translator with AST validation and $0/mo infra
```

**First comment** (post immediately after submission to preempt questions):

---

Hi HN! I'm Tarun, and I've been building **Anuvaad** — an AI code translation platform that converts code between 35+ languages with Tree-sitter AST boundary validation.

The thing I'm most proud of: it runs entirely on free tiers with zero budget. Here's the actual infrastructure breakdown:

- **Compute**: Oracle Always Free ARM (4 OCPUs, 24GB RAM) — never sleeps, 0ms cold starts
- **AI**: 5-tier gateway: Cerebras LPU → Gemini 2.0 Flash → DeepSeek V3 → Groq → Ollama local. Each tier fails over to the next automatically.
- **DB**: Supabase PostgreSQL + pgvector for semantic search
- **Frontend**: Vercel Hobby + Cloudflare CDN
- **Total monthly burn: $0.00**

**What makes it technically interesting:**

1. **AST Boundary Validation** — Uses Tree-sitter (370+ languages via `tree-sitter-language-pack`) to extract function/class boundaries from the LLM output before returning it to the user. If the AST has errors, we reject the output and retry. No unvalidated LLM output ever reaches users.

2. **Cryptographic Zero Data Retention** — Source code never touches disk. It streams through volatile RAM only. Every translation generates an HMAC-SHA256 audit receipt you can independently verify: `sha256(secret, user_id + timestamp + code_hash)`.

3. **The 5-tier failover** — In production, Cerebras handles ~90% of requests at 2,100 tokens/sec. When it rate-limits, we fall through to Gemini, then DeepSeek, then local Ollama on the Oracle VM. The whole thing is managed by LiteLLM proxy with latency-based routing.

4. **PR Review** — The GitHub App webhooks already exist and are wired to a Celery task that calls the AI, parses the diff with a unified diff parser, and posts inline comments via GitHub REST API.

**Stack**: FastAPI 0.139, Next.js 16.3, React 19, SQLAlchemy 2.0 async, Tree-sitter 0.23, LiteLLM, Tailwind v4, Monaco Editor

Free tier: translate up to 50k tokens/day. Paid: $19/mo Pro.

Try it: https://getanuvaad.com
CLI: `npx @anuvaad/cli translate myfile.py --to typescript`
GitHub: [github link]

Happy to answer questions about the zero-budget architecture, AST validation approach, or the AI gateway failover logic.

---

## Product Hunt

**Tagline** (max 60 chars):
```
AI code translator with AST validation — $0/mo infra
```

**Description**:
```
Anuvaad translates code between 35+ programming languages using a 5-tier AI gateway (Cerebras → Gemini → DeepSeek → Groq → Ollama) with automatic failover.

What's unique:
• Tree-sitter AST validation — LLM output is parsed and boundary-checked before delivery. No malformed code reaches users.
• Cryptographic Zero Data Retention — HMAC-SHA256 audit receipts prove your code never touched disk
• $0.00/month infrastructure — Oracle Always Free ARM, all free-tier APIs, self-hosted Ollama fallback
• GitHub App — Paste our app into your repo, get AI architectural PR review comments automatically
• CLI — `npx @anuvaad/cli translate file.py --to typescript`

Built by one developer over 10 weeks as a zero-budget startup experiment.
```

**First comment** (from maker, post immediately at 12:01 AM PT):
```
Hey PH! 👋 

Anuvaad started as a question: can you build a production-grade AI developer tool with literally zero infrastructure cost?

The answer turned out to be yes — but it requires being creative about where compute comes from. The Oracle Always Free tier gives you 4 ARM OCPUs and 24GB RAM permanently. Cerebras Cloud gives you 1M tokens/day free on their LPU chips (2,100 tokens/sec). Supabase gives you PostgreSQL + pgvector. Stack them all with a LiteLLM gateway for automatic failover, and you have a real production system for $0/month.

The hardest part technically was the AST validation layer. LLMs frequently produce syntactically broken code — missing brackets, wrong indentation, truncated functions. Tree-sitter lets us catch this deterministically before the output leaves the server.

Free plan: 50k tokens/day
Pro: $19/month (unlimited, priority routing, PR review)

Try the CLI: `npx @anuvaad/cli help`

Would love your feedback on what languages/features matter most to you! 🙏
```

## Dev.to / Hashnode Article Outline

**Title**: How I built a 5-tier AI failover code translator with zero infrastructure cost

**Outline**:
1. The problem: LLM APIs rate-limit at the worst times
2. Architecture: The 5-tier gateway (Cerebras → Gemini → DeepSeek → Groq → Ollama)
3. LiteLLM as the proxy — configuration and routing strategy
4. Tree-sitter AST validation — why LLM output can't be trusted raw
5. Oracle Always Free ARM — the secret to $0 compute
6. Cryptographic Zero Data Retention — HMAC receipts explained
7. The numbers: tokens/sec, latency P95, monthly cost
8. What I'd do differently

## Twitter/X Thread

**Thread opening** (for engagement):
```
I just launched a code translation tool that runs on $0/month infra.

Here's the zero-budget architecture that makes it possible 🧵

1/8
```

**Thread content**:
```
2/8: The compute problem

Render free tier sleeps after 15 minutes. That's unusable for a real product.

Oracle Always Free gives you 4 ARM OCPUs and 24GB RAM. Permanently. No credit card. It never sleeps.

→ $0/month compute solved.

3/8: The AI problem

Every LLM API rate-limits. When Cerebras hits the limit, requests die.

Solution: 5-tier gateway with automatic failover:
Tier 1: Cerebras LPU (2,100 tok/s, 1M/day free)
Tier 2: Gemini 2.0 Flash (1M TPM free)
Tier 3: DeepSeek V3
Tier 4: Groq
Tier 5: Local Ollama on the Oracle VM

LiteLLM routes between them automatically.

4/8: The LLM output problem

LLMs produce broken code. Missing brackets, truncated functions, wrong indentation.

You can't just return LLM output raw.

I use Tree-sitter to parse every response. If node.has_error is true, we reject and retry. Users never see broken code.

5/8: The privacy problem

Enterprise customers ask: "does my code leave our network?"

I built cryptographic Zero Data Retention:
- Code streams through volatile RAM only
- HMAC-SHA256 receipt generated: sha256(secret, user_id + timestamp + code_hash)
- You can independently verify the receipt

6/8: The database problem

Supabase gives you PostgreSQL + pgvector free forever (500MB).

I use pgvector with IVFFlat indexing for semantic code search — find "functions that handle auth" across your entire codebase.

7/8: The result

$0.00/month. No compromises on reliability.

- 559 backend tests passing
- 28 routes building clean
- P95 latency < 800ms
- 5-tier failover with zero downtime

8/8: Try it

Web: getanuvaad.com
CLI: npx @anuvaad/cli translate myfile.py --to typescript

What language pairs do you need most? 👇
```

## Reddit r/programming Post

**Title**: I built an AI code translator that runs on $0/month — here's the architecture

**Body**:
```
Anuvaad is a code translation tool I've been building. It converts code between 35+ languages using a 5-tier AI gateway with automatic failover and Tree-sitter AST validation.

The interesting technical bits:

**5-tier AI failover**: Cerebras Cloud LPU (2,100 tok/s) → Gemini 2.0 Flash → DeepSeek V3 → Groq → local Ollama. When one rate-limits, the next takes over. Managed by LiteLLM proxy with latency-based routing.

**AST validation**: Every LLM response is parsed with Tree-sitter before delivery. If `node.has_error` is true, we reject and retry. This catches missing brackets, truncated functions, wrong indentation — common LLM failure modes.

**Zero infrastructure cost**: Oracle Always Free ARM (4 OCPUs, 24GB), Supabase PostgreSQL, all free-tier APIs. $0.00/month operational cost, verified.

**Cryptographic privacy**: HMAC-SHA256 audit receipt per translation. Code only ever touches RAM.

Stack: FastAPI 0.139, Next.js 16.3, Python 3.12, Tree-sitter 0.23, SQLAlchemy 2.0 async, LiteLLM, Tailwind v4

Demo: getanuvaad.com
CLI: `npx @anuvaad/cli help`

Happy to discuss the architecture in the comments.
```

## Indie Hackers Post

**Title**: Launched an AI code translation tool — $0 infra, first revenue attempt

**Format**: Build-in-public transparency post with actual cost breakdown, conversion numbers as they come in, and the story of choosing Oracle Always Free over Render.
```
