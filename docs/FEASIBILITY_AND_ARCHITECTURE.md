# Anuvaad — Feasibility & Architecture Reference

> **Version:** v1.2.0-prod  
> **Date:** October 2026  
> **Status:** Current Production Architecture

---

## 1. Executive Summary

Anuvaad is a full-stack AI code translation platform operating on a **verified \$0.00/month infrastructure budget** while delivering enterprise-grade features including bidirectional AST analysis, two-tier caching, client-side BYOK encryption, and a fully offline local analysis engine. This document describes the architectural decisions, cost controls, security model, and v1.2.0 Daily-Driver Workspace features.

---

## 2. The 4-Layer \$0/Month Cost Shield

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: L1 In-Memory TTLCache (cachetools)                    │
│  • 256-entry LRU, 24h TTL, sha256(lang:depth:normalized_ast)    │
│  • Sub-millisecond hit rate for repeated code patterns          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Upstash Redis (L2 persistent)                        │
│  • 10,000 commands/day free tier                                │
│  • Stores full translation JSON, 24h TTL                        │
│  • L1 miss → L2 lookup → repopulates L1 on hit                  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: 3-Run Guest Sandbox                                   │
│  • 3 free translations for unauthenticated visitors             │
│  • Fingerprinted via IP + User-Agent hash                       │
│  • Encourages sign-up without blocking exploration              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: On-Device Local AST Engine (v1.2.0)                  │
│  • Babel parser + structural heuristics, 100% browser-side      │
│  • Zero network calls, zero LLM tokens, zero cost               │
│  • Available even when offline or quota-exhausted               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 AST Cache Key Design

Cache keys are computed as:

```
sha256(f"{language}:{depth}:{normalized_ast}")
```

Where:
- **`language`**: Lowercased language identifier (`python`, `typescript`, etc.)
- **`depth`**: Explanation persona (`tldr` | `dev` | `audit`), defaulting to `dev`
- **`normalized_ast`**: Source code with comments/docstrings stripped, whitespace collapsed

**v1.2.0 addition:** The `depth` dimension partitions the cache so `TL;DR`, `Dev`, and `CS Audit` explanations for the same code are stored and retrieved independently.

### 2.2 AI Inference Cost Routing

| Tier | Provider | Model | Cost |
|------|----------|-------|------|
| 1 | Cerebras Cloud | Llama 3.3 70B | \$0 (free tier) |
| 2 | Google Gemini | 2.0 Flash | \$0 (free API tier) |
| 3 | DeepSeek | V3 / R1 | \$0 (free tier) |
| 4 | OpenRouter | Free models | \$0 |
| 5 | Local Ollama | User-installed | \$0 |

---

## 3. Zero-Data-Retention (ZDR) Architecture

Every translation request generates a deterministic HMAC-SHA256 audit receipt:

```python
audit_receipt = {
    "audit_digest": hmac_sha256(
        secret=settings.AUDIT_SECRET,
        message=f"{user_id}:{timestamp}:{code_hash}"
    )
}
```

This receipt is returned in the `X-Anuvaad-Audit-Digest` response header, providing a cryptographic proof that:
1. The code was processed at a specific timestamp
2. The user identity was verified
3. No persistent copy was written (application-level)

**Ephemeral mode:** When `X-Anuvaad-Privacy-Mode: ephemeral` is set, the backend skips all application-level history and cache writes.

### 3.1 PostgreSQL Row-Level Security

All user-facing tables enforce RLS with the `private.get_user_workspaces()` policy function:

```sql
CREATE POLICY "users_own_workspaces" ON workspaces
  USING (user_id = auth.uid());

CREATE POLICY "users_own_translations" ON translation_history
  USING (user_id = auth.uid());
```

Direct cross-user data access is prevented at the database layer, independent of application logic.

---

## 4. v1.2.0 Daily-Driver Workspace Architecture

### 4.1 GitHub URL Swap Trick

```
User visits:  https://getanuvaad.vercel.app/{owner}/{repo}/blob/{branch}/{file}
                      ↓ Next.js [...githubPath] catch-all route
                      ↓ Path shape validation (≥4 segments, type=blob|pull)
                      ↓ redirect /dashboard/translate?github={encodedUrl}
                      ↓ TranslateFeature useEffect reads ?github= param
                      ↓ resolveGitHubSource() → fetchGithubFileContent()
                      ↓ Monaco editor populated, language auto-detected
```

**SSRF Allowlist (enforced client-side):**
- `github.com` (HTTPS only) — blob and PR URLs
- `raw.githubusercontent.com` (HTTPS only) — direct raw file downloads
- `api.github.com` (HTTPS only) — PR metadata and unified diffs

Any other hostname throws immediately before any network call is made.

### 4.2 Smart Clipboard Auto-Detection

A deterministic classifier (`classifyClipboardText`) runs in `< 2ms` using pre-compiled regex patterns:

```
Input text → Priority classifier cascade:
  1. Unified diff patterns     → kind: "diff"
  2. Stack trace patterns      → kind: "stacktrace" + lang detection
  3. SQL DDL/DML keywords      → kind: "sql"
  4. JSON.parse() success      → kind: "json"
  5. Code char density > 5%   → kind: "code" + language signal scoring
  6. Default                  → kind: "english"
```

The `SmartPasteListener` component attaches a global `paste` event listener that fires only when the user is not actively typing in a native input/textarea.

### 4.3 Bidirectional AST X-Ray Line Sync

```
Source Code → extractAstLineRanges(code, language)
                 ↓ Babel parser (JS/TS/JSX/TSX)
                 ↓ Structural heuristic fallback (Python, Rust, Go)
             → AstCodeRange[] with {startLine, endLine, name, type}

Translation API response → annotateBlocksWithLineRanges(code, blocks, lang)
                             ↓ AST exact match → snippet lookup → cursor scan
                           → blocks[].{startLine, endLine}

BlockCard hover → setActiveHoveredBlockId(id)
               → Lines badge highlights amber: "L{start}–{end}"
```

### 4.4 Work Artifact Exporter

Three zero-token, instant client-side actions:

| Action | Implementation |
|--------|---------------|
| **Inject JSDoc** | String splice above each `[startLine]` boundary |
| **Inject PEP-257** | Insert `"""..."""` on line after `def`/`class` |
| **Copy PR Markdown** | `## Summary / ## Block-by-Block / ## Complexity` template |
| **AST Binding Audit** | `extractAstLineRanges()` → symbol count badge |

Docstring injection includes a 1-click **Undo** that restores the original code from a `useRef`.

### 4.5 Persona Depth Slider

```
Toolbar: [ TL;DR | Dev | CS Audit ]
            ↓
useTranslationStore.explanationDepth: "tldr" | "dev" | "audit"
            ↓
/api/code-to-english body: { depth: "tldr" }
            ↓
FastAPI CodePayload.depth: Literal["tldr", "dev", "audit"] | None
            ↓
stream_code_to_english(depth="tldr")
            ↓
SYSTEM_INSTRUCTION = DEPTH_PREFIXES["tldr"] + base_instruction
            ↓
compute_ast_cache_key(code, language, depth="tldr")
```

**Prompt prefixes by depth:**

| Depth | System Instruction Prefix |
|-------|--------------------------|
| `tldr` | "Give an extremely concise TL;DR — ONE sentence maximum per block." |
| `dev` | *(none — standard explanation)* |
| `audit` | "Perform a security & complexity audit. Note cyclomatic complexity, OWASP risks, injection points." |

### 4.6 Zero-Network Offline Local AST Engine

```
executeLocalOfflineEngine(code, { language })
  → extractAstLineRanges(code, language)         [Babel / structural heuristic]
  → for each AstCodeRange:
      generateBlockExplanation(range)             [template-based, zero ML]
        → estimateComplexity(snippet)             [regex branch counting]
        → analyzeSignature(snippet)               [regex param extraction]
        → compose English description
  → TranslationBlock[]                           [< 20ms, 0 network calls]
```

Activated from:
- `QuotaExceededModal` → "Instant Local AST Breakdown (Offline · \$0)" button
- Workspace toolbar → Engine Mode Selector → "Offline" mode

---

## 5. Global Competitor Benchmark Matrix

| Feature | Anuvaad v1.2.0 | GitHub Copilot | Cursor | ChatGPT |
|---------|---------------|----------------|--------|---------|
| Cost | **\$0/month** | \$10–19/month | \$20/month | \$20/month |
| Offline mode | **✓ (Local AST)** | ✗ | ✗ | ✗ |
| GitHub URL → workspace | **✓ (URL swap)** | ✗ | Partial | ✗ |
| AST semantic caching | **✓ (2-tier)** | ✗ | ✗ | ✗ |
| Smart paste detection | **✓ (< 2ms)** | ✗ | ✗ | ✗ |
| BYOK encryption | **✓ (AES-GCM-256)** | ✗ | ✗ | ✗ |
| Multi-language support | **✓ (15+ langs)** | ✓ | ✓ | ✓ |
| PR description export | **✓ (1-click)** | Partial | ✗ | ✗ |
| Docstring injection | **✓ (JSDoc + PEP-257)** | Partial | Partial | ✗ |
| Depth-personalized output | **✓ (TL;DR / Dev / Audit)** | ✗ | ✗ | ✗ |

---

## 6. Infrastructure Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Frontend: Next.js 16 + React 19 + Tailwind v4                     │
│  Deploy:   Vercel (Hobby — free)                                    │
│  CDN:      Vercel Edge Network                                      │
├────────────────────────────────────────────────────────────────────┤
│  Backend:  FastAPI 0.139 + Python 3.11–3.13                        │
│  Deploy:   Render (Free — 750 hrs/month)                            │
│  Database: Supabase PostgreSQL + pgvector (Free tier)               │
│  Cache L1: cachetools TTLCache (in-process RAM)                     │
│  Cache L2: Upstash Redis (10K commands/day free)                    │
├────────────────────────────────────────────────────────────────────┤
│  Client-Side Engine (browser, zero server):                        │
│  • Babel AST Parser (@babel/parser, @babel/traverse)               │
│  • Offline Local Analysis Engine (lib/local-engine.ts)              │
│  • AES-GCM-256 BYOK Vault (lib/byok-vault.ts)                      │
│  • Smart Clipboard Classifier (lib/smart-clipboard.ts)              │
└────────────────────────────────────────────────────────────────────┘
```

---

## 7. Security Architecture

### 7.1 SSRF Protection
- **Client-side:** `ALLOWED_HOSTS` Set enforced before any `fetch()` call in `github-import.ts`
- **Backend:** Domain allowlist in GitHub import router, HTTPS-only enforcement
- **API gateway:** Rate limiting (10 req/60s per IP) on all translation endpoints

### 7.2 Authentication & Authorization
- Supabase Auth JWT verification on all protected endpoints
- Optional guest mode: 3-run sandbox with fingerprint-based quota enforcement
- BYOK: User-provided API keys encrypted with AES-GCM-256 in browser IndexedDB — never transmitted to Anuvaad servers

### 7.3 Input Sanitization
- Pydantic V2 strict schemas with `min_length`, `max_length` constraints
- `raw_code` validated: max 50,000 characters, non-blank
- Language field lowercased and stripped before processing

### 7.4 HMAC Audit Trail
Every translation response includes `X-Anuvaad-Audit-Digest: sha256(secret, user_id + timestamp + code_hash)`.

---

## 8. v1.2.0 Release Change Summary

### New Files
| File | Purpose |
|------|---------|
| `frontend/src/app/[...githubPath]/page.tsx` | GitHub URL swap catch-all route |
| `frontend/src/lib/smart-clipboard.ts` | Clipboard payload classifier (< 2ms) |
| `frontend/src/features/translate/_components/SmartPasteListener.tsx` | Global paste interceptor |
| `frontend/src/components/editor/ArtifactExportBar.tsx` | Docstring + PR markdown exporter |
| `frontend/src/features/translate/_components/Toolbar/DepthSlider.tsx` | 3-stop persona depth selector |

### Modified Files
| File | Change |
|------|--------|
| `frontend/src/lib/github-import.ts` | + PR URL parsing, `api.github.com` allowlist, `resolveGitHubSource()` |
| `frontend/src/features/translate/_components/BlockCard/index.tsx` | + Lines X–Y hover badge |
| `frontend/src/features/translate/_components/Toolbar/index.tsx` | + DepthSlider mount |
| `frontend/src/features/translate/_store/useTranslationStore.ts` | + `explanationDepth` field |
| `frontend/src/features/translate/_hooks/useTranslationStream.ts` | + `depth` API param |
| `frontend/src/components/modals/QuotaExceededModal.tsx` | + Offline AST button |
| `app/models/schemas.py` | + `depth` field on `CodePayload` |
| `app/services/ast_cache.py` | + `depth` in cache key hash |
| `app/services/ai.py` | + `DEPTH_PREFIXES` prompt branching |
| `app/routers/translate/code_to_english.py` | + Thread `depth` through |

---

*Anuvaad — Built on \$0 infrastructure. Zero compromises on engineering quality.*
