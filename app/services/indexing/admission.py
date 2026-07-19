"""Bounded, fail-closed admission checks for repository indexing."""

from __future__ import annotations

from dataclasses import dataclass

MAX_REPOSITORY_FILES = 2_000
MAX_REPOSITORY_BYTES = 20 * 1024 * 1024
MAX_FILE_BYTES = 1 * 1024 * 1024
SUPPORTED_PROVIDERS = frozenset({"github"})


class AdmissionRejectedError(ValueError):
    """Raised before expensive ingestion work is allowed to begin."""


@dataclass(frozen=True)
class AdmissionPolicy:
    max_files: int = MAX_REPOSITORY_FILES
    max_repository_bytes: int = MAX_REPOSITORY_BYTES
    max_file_bytes: int = MAX_FILE_BYTES

    def validate_request(self, provider: str, chunk_size: int) -> None:
        if provider.casefold() not in SUPPORTED_PROVIDERS:
            raise AdmissionRejectedError("repository provider is not supported")
        if chunk_size <= 0 or chunk_size > self.max_file_bytes:
            raise AdmissionRejectedError("index configuration has an invalid chunk size")

    def validate_content(self, files: list[dict[str, str]]) -> None:
        if not files:
            raise AdmissionRejectedError("repository contains no indexable files")
        if len(files) > self.max_files:
            raise AdmissionRejectedError("repository exceeds the file admission limit")
        total_bytes = 0
        for file in files:
            content = file.get("content", "")
            size = len(content.encode("utf-8"))
            if not file.get("path") or not content.strip():
                raise AdmissionRejectedError("repository contains an invalid source file")
            if size > self.max_file_bytes:
                raise AdmissionRejectedError("repository contains a file above the size limit")
            total_bytes += size
            if total_bytes > self.max_repository_bytes:
                raise AdmissionRejectedError("repository exceeds the content admission limit")
