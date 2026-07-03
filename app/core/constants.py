"""
app/core/constants.py

FIX-31 (P3-01): Named constants replacing magic numbers throughout the codebase.

Previously, values like 50_000 (max chars), 20 (default page size), and 1536
(embedding dimension) were scattered inline. Consolidating them here makes
changes a single-line edit with zero risk of missing a callsite.

Usage:
    from app.core.constants import MAX_INPUT_CHARS, DEFAULT_HISTORY_PAGE_SIZE
"""

# ── Translation History ──
MAX_HISTORY_PRO = 1_000           # Max history records kept for Pro users
MAX_HISTORY_FREE = 100            # Max history records kept for Free users
MAX_HISTORY_PAGE_SIZE = 100       # Maximum `limit` allowed in /api/history
DEFAULT_HISTORY_PAGE_SIZE = 20    # Default page size when no `limit` param supplied

# ── Code Input Validation ──
MIN_PRINTABLE_CHAR_RATIO = 0.10   # 10% of input must be printable (rejects binary blobs)
MAX_COMMENT_RATIO = 0.50          # >50% comment lines = probably not real code
MIN_CODE_LINES = 1                # Minimum non-empty lines required

# ── Character & Payload Limits ──
MAX_INPUT_CHARS = 50_000          # Absolute hard cap per translation request
FREE_TIER_CHAR_LIMIT = 10_000     # Char limit for free-tier users
PRO_TIER_CHAR_LIMIT = 50_000      # Char limit for Pro users

# ── LLM Output ──
MAX_OUTPUT_TOKENS = 4_096         # Max tokens requested from LLM
LLM_TIMEOUT_SECONDS = 60         # Request timeout for LLM API calls

# ── Embeddings ──
EMBEDDING_DIMENSION_OPENAI = 1_536    # OpenAI text-embedding-3-small
EMBEDDING_DIMENSION_HF = 384          # HuggingFace all-MiniLM-L6-v2
CHUNK_SIZE_CHARS = 1_500             # Code chunk size for embedding indexing
CHUNK_OVERLAP_CHARS = 200            # Overlap between consecutive chunks

# ── Cache TTLs (seconds) ──
PRO_STATUS_CACHE_TTL = 60          # 1 minute — pro status check result
TODAY_USAGE_CACHE_TTL = 60         # 1 minute — daily usage count
TRANSLATION_CACHE_TTL = 3_600      # 1 hour  — LLM semantic cache
LIFETIME_TRANSLATION_CACHE_TTL = 60

# ── Rate Limiting ──
RATE_LIMIT_WINDOW_SECONDS = 60    # Sliding window for rate limit counters
INJECTION_RATE_LIMIT_WINDOW = 3_600  # 1 hour — injection attempt rate limit
MAX_INJECTION_ATTEMPTS_PER_HOUR = 5

# ── API Pagination ──
API_KEY_PREFIX_LENGTH = 8          # Prefix chars stored for display (without the key itself)

# ── File Upload Limits ──
FREE_MAX_FILE_BYTES = 50 * 1_024   # 50 KB
PRO_MAX_FILE_BYTES = 200 * 1_024   # 200 KB

# ── Onboarding ──
ONBOARDING_REDIRECT_PATH = "/onboarding"
DASHBOARD_PATH = "/dashboard"
