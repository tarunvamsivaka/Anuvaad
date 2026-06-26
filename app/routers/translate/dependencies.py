import re
from fastapi import HTTPException
from app.core.config import logger

def sanitise_input(raw_code: str, mode: str, email: str | None = None) -> str:
    """Detects and neutralises prompt injection patterns hidden in comments.
    Also handles Unicode obfuscation, RTL injection, and zero-width character attacks.
    """
    if not raw_code:
        return raw_code

    def replacer(match):
        if email:
            logger.warning(f"Prompt injection detected from {email} in mode {mode}")
        else:
            logger.warning(f"Prompt injection detected from anonymous user in mode {mode}")
        return "[REDACTED INJECTION ATTEMPT]"

    # Strip zero-width and RTL/LTR override characters (SEC-05 Unicode obfuscation)
    UNICODE_CONTROL = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff\u00ad]")
    raw_code = UNICODE_CONTROL.sub("", raw_code)

    # Standard prompt injection patterns in single-line comments
    # BUG#9 FIX: Added \b word boundaries and optional whitespace to prevent false positives.
    # e.g. "ignored_count", "disregarded", variable names containing injection keywords.
    pattern_line = r"(?i)(//|#)[^\n]*?\b(ignore previous|system prompt|you are now|act as|jailbreak|\bdan\b|disregard instructions)\b[^\n]*"
    raw_code = re.sub(pattern_line, replacer, raw_code)

    # Prompt injection inside block comments / docstrings
    # BUG#9 FIX: Made delimiters more precise to avoid matching across unrelated constructs.
    pattern_block = r"(?is)(/\*|<!--|\'\'\'|\"\"\").*?\b(ignore previous|system prompt|you are now|act as|jailbreak|\bdan\b|disregard instructions)\b.*?(?:\*/|-->|\'\'\'|\"\"\")"
    raw_code = re.sub(pattern_block, replacer, raw_code)

    return raw_code


def validate_code_input(raw_code: str):
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
        ignore_count = sum(
            1 for line in lines if re.match(r"^\s*(//|#)\s*ignore", line, re.IGNORECASE)
        )
        if ignore_count / len(lines) > 0.5:
            raise HTTPException(
                status_code=422,
                detail="Input rejected: Too many ignored lines detected.",
            )


# EXTENSION_TO_LANGUAGE, ALLOWED_EXTENSIONS, FREE_MAX_FILE_SIZE, PRO_MAX_FILE_SIZE
# are imported from app.core.config (Arch#2.9: single definition).
