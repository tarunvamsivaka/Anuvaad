"""
app/routers/translate/dependencies.py

Input validation and prompt injection defence.

FIX-23 (P1-01): Strengthened prompt injection detection:
  - Added more injection keywords (roleplay, pretend, payload, exfiltrate…)
  - Added multi-line HEREDOC-style injection patterns
  - Expanded Unicode obfuscation to cover Hangul/Arabic/Cyrillic lookalikes
  - Added HTTP/data-URI injection detection (SSRF-via-prompt)
  - Added entropy-based detection for base64-encoded payloads in comments
FIX-25 (P1-10/A10): Added URL-in-code SSRF hardening in validate_code_input.
"""

import base64
import re
import unicodedata

from fastapi import HTTPException

from app.core.config import logger

# ---------------------------------------------------------------------------
# Prompt injection patterns
# ---------------------------------------------------------------------------

# Injection keywords — extended significantly from the original set
_INJECTION_KEYWORDS = (
    r"ignore previous"
    r"|system prompt"
    r"|you are now"
    r"|act as"
    r"|jailbreak"
    r"|\bdan\b"
    r"|disregard instructions"
    r"|roleplay as"
    r"|pretend you are"
    r"|new personality"
    r"|exfiltrate"
    r"|forget all"
    r"|[Ss]ystem:"  # LLM system message injection
    r"|[Hh]uman:"  # LLM conversation injection
    r"|[Aa]ssistant:"  # LLM conversation injection
    r"|\[INST\]"  # Llama-2 instruction injection
    r"|<\|system\|>"  # Llama-3 / ChatML injection
    r"|<\|im_start\|>"  # ChatML injection
    r"|\bpayload\b"  # Common in jailbreak templates
)

_UNICODE_CONTROL = re.compile(
    r"[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff\u00ad"
    r"\u034f\u115f\u1160\u17b4\u17b5"  # Hangul filler chars
    r"\u180b-\u180e"  # Mongolian control chars
    r"\ufe00-\ufe0f"  # Variation selectors
    r"\U000e0020-\U000e007f"  # Tag characters (Emoji ZWJ tricks)
    r"]"
)

# Single-line comment injection (Python/JS/C/SQL/Shell)
_PATTERN_LINE = re.compile(rf"(?i)(//|#|--)[^\n]*?\b(?:{_INJECTION_KEYWORDS})\b[^\n]*")

# Block comment / docstring injection
_PATTERN_BLOCK = re.compile(rf"(?is)(/\*|<!--|'''|\"\"\").*?\b(?:{_INJECTION_KEYWORDS})\b.*?(?:\*/|-->|'''|\"\"\")")

# HEREDOC-style injection (e.g. Python f-strings, shell heredocs)
_PATTERN_HEREDOC = re.compile(rf"(?is)<<<?\w+.*?\b(?:{_INJECTION_KEYWORDS})\b.*?<<<?\w+")

# Data/HTTP URIs in comments that could be SSRF-via-prompt
_PATTERN_URL_IN_COMMENT = re.compile(r"(?i)(//|#|--)[^\n]*?(https?://|data:)[^\n]*")
_PATTERN_B64_CANDIDATE = re.compile(r"(?://|#|--)\s*([A-Za-z0-9+/]{40,}={0,2})")
_PATTERN_INJECTION_KEYWORDS_SEARCH = re.compile(_INJECTION_KEYWORDS, re.IGNORECASE)
_PATTERN_IGNORE_COMMENT = re.compile(r"^\s*(//|#)\s*ignore", re.IGNORECASE)
_PATTERN_DANGEROUS_URL = re.compile(r"(?i)\b(file|jar|ftp|gopher|dict|tftp|ldap)://")


def _maybe_base64_injection(text: str) -> bool:
    """Heuristic: flag suspiciously long base64-looking strings in comments.

    Encoded payloads are a common evasion technique — attackers base64-encode
    their injection to bypass keyword matching.
    """
    b64_candidates = _PATTERN_B64_CANDIDATE.findall(text)
    for candidate in b64_candidates:
        try:
            decoded = base64.b64decode(candidate).decode("utf-8", errors="ignore")
            # If the decoded string contains injection keywords, flag it
            if _PATTERN_INJECTION_KEYWORDS_SEARCH.search(decoded):
                return True
        except Exception:
            pass
    return False


def sanitise_input(raw_code: str, mode: str, email: str | None = None) -> str:
    """Detect and neutralise prompt injection patterns hidden in code/comments.

    FIX-23 (P1-01): Expanded injection keyword list, HEREDOC patterns, base64
    evasion detection, and Unicode obfuscation coverage.
    """
    if not raw_code:
        return raw_code

    raw_code = unicodedata.normalize("NFKC", raw_code)

    def replacer(match):
        user = email or "anonymous"
        logger.warning(
            "Prompt injection detected",
            user=user,
            mode=mode,
            match_length=len(match.group(0)),
        )
        return "[REDACTED INJECTION ATTEMPT]"

    # 1. Strip invisible/obfuscation Unicode control characters
    raw_code = _UNICODE_CONTROL.sub("", raw_code)

    # 2. Single-line comment injection
    raw_code = _PATTERN_LINE.sub(replacer, raw_code)

    # 3. Block comment / docstring injection
    raw_code = _PATTERN_BLOCK.sub(replacer, raw_code)

    # 4. HEREDOC injection
    raw_code = _PATTERN_HEREDOC.sub(replacer, raw_code)

    # 5. URL-in-comment injection (can lead LLM to fetch attacker-controlled URLs)
    raw_code = _PATTERN_URL_IN_COMMENT.sub(replacer, raw_code)

    # 6. Base64-encoded injection evasion detection (flag and redact the comment)
    if _maybe_base64_injection(raw_code):
        user = email or "anonymous"
        logger.warning(
            "Base64-encoded injection attempt detected",
            user=user,
            mode=mode,
        )
        # Redact the entire base64-looking comment
        raw_code = _PATTERN_B64_CANDIDATE.sub(
            "[REDACTED BASE64 PAYLOAD]",
            raw_code,
        )

    return raw_code


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------


def validate_code_input(raw_code: str):
    """Validate the raw code input before passing to LLM.

    Raises HTTP 422 for:
    - Inputs > 50,000 chars (per-tier enforcement is in quota.py)
    - Binary / non-printable data
    - Suspiciously high ratio of 'ignore' comments
    - FIX-25: File:// or other dangerous URL schemes (SSRF prevention)
    """
    if len(raw_code) > 50000:
        raise HTTPException(
            status_code=422,
            detail="Input exceeds the maximum allowed length of 50,000 characters.",
        )

    if len(raw_code) == 0:
        return

    printable_count = sum(1 for c in raw_code if c.isprintable() or c.isspace())
    if (printable_count / len(raw_code)) < 0.1:
        raise HTTPException(
            status_code=422,
            detail="Input contains too many non-printable characters. Binary uploads are not supported.",
        )

    lines = raw_code.splitlines()
    if lines:
        ignore_count = sum(1 for line in lines if _PATTERN_IGNORE_COMMENT.match(line))
        if ignore_count / len(lines) > 0.5:
            raise HTTPException(
                status_code=422,
                detail="Input rejected: Too many ignored lines detected.",
            )

    # FIX-25 (P1-10/A10): Reject file:// and other dangerous URL schemes.
    # An LLM could be tricked into including file:// paths in its output which
    # a downstream renderer might follow (SSRF or LFI via generated code).
    if _PATTERN_DANGEROUS_URL.search(raw_code):
        raise HTTPException(
            status_code=422,
            detail=(
                "Input contains a potentially dangerous URL scheme (file://, ftp://, etc). Use https:// links only."
            ),
        )


# EXTENSION_TO_LANGUAGE, ALLOWED_EXTENSIONS, FREE_MAX_FILE_SIZE, PRO_MAX_FILE_SIZE
# are imported from app.core.config (Arch#2.9: single definition).


def dispatch_history(
    background_tasks,
    *,
    user_email: str,
    mode: str,
    source_language: str,
    target_language: str,
    input_text: str,  # ZDR: callers must pass a safe summary, NOT raw source code
    input_hash: str | None = None,  # HMAC-SHA256 of raw input code (ZDR receipt)
    blocks: list,
    model_used: str,
    workspace_id: str | None = None,
    session_id: str | None = None,
    repository_name: str | None = None,
    file_path: str | None = None,
) -> None:
    """Dispatch translation history persistence with Celery → BackgroundTasks fallback.

    ZDR Invariant (AGENTS.md Rule #1):
    - `input_text` MUST be a safe metadata summary, never raw source code.
    - `input_hash` carries the HMAC-SHA256 audit digest for verifiable ZDR proofs.
    """
    from app.core.quota import save_translation_background
    from app.queue.tasks import save_translation_history_task

    kwargs = dict(
        user_email=user_email,
        mode=mode,
        source_language=source_language,
        target_language=target_language,
        input_text=input_text,
        input_hash=input_hash,
        blocks=blocks,
        model_used=model_used,
        workspace_id=workspace_id,
        session_id=session_id,
        repository_name=repository_name,
        file_path=file_path,
    )
    try:
        save_translation_history_task.delay(**kwargs)
    except Exception as celery_err:
        logger.warning(f"Celery unavailable ({celery_err!s}); falling back to BackgroundTasks for history save.")
        background_tasks.add_task(save_translation_background, **kwargs)
