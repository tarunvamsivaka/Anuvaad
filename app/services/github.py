import base64
import hashlib
import os
from concurrent.futures import ThreadPoolExecutor

import structlog
from github import Auth, Github

logger = structlog.get_logger(__name__)

SUPPORTED_EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".md",
    ".txt",
    ".json",
    ".yml",
    ".yaml",
    ".html",
    ".css",
    ".go",
    ".rs",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".java",
    ".rb",
    ".php",
}
MAX_REPO_FILES = 500
MAX_FETCH_WORKERS = 8


def get_github_client(access_token: str | None = None) -> Github:
    token = access_token or os.environ.get("GITHUB_PAT")
    if not token:
        logger.warning("GITHUB_PAT environment variable not set, using unauthenticated client")
        return Github()
    auth = Auth.Token(token)
    return Github(auth=auth)


def fetch_repository_files(repo_name: str) -> list[dict[str, str]]:
    """
    Fetches text files from a repository.
    repo_name should be formatted as 'owner/repo'
    """
    g = get_github_client()
    repo = g.get_repo(repo_name)

    files = []
    logger.info(f"Fetching repository tree for {repo_name}")
    try:
        tree = repo.get_git_tree(repo.default_branch, recursive=True).tree
    except Exception as e:
        logger.error(f"Failed to fetch tree for {repo_name}: {e}")
        return []

    candidates = [
        element
        for element in tree
        if element.type == "blob"
        and os.path.splitext(element.path)[1].lower() in SUPPORTED_EXTENSIONS
        and getattr(element, "size", 0) <= 1024 * 1024
    ][:MAX_REPO_FILES]

    def fetch(element):
        try:
            blob = repo.get_git_blob(element.sha)
            if blob.encoding == "base64":
                content = base64.b64decode(blob.content).decode("utf-8", errors="ignore")
            elif blob.encoding == "utf-8":
                content = blob.content
            else:
                return None
            return {"path": element.path, "content": content}
        except Exception as e:
            logger.debug("Failed to fetch/decode repository file", path=element.path, error=str(e))
            return None

    with ThreadPoolExecutor(max_workers=MAX_FETCH_WORKERS) as executor:
        files = [file for file in executor.map(fetch, candidates) if file is not None]

    logger.info(f"Successfully fetched {len(files)} files from {repo_name}")
    return files


def fetch_repository_snapshot(repo_name: str, revision_sha: str, access_token: str | None = None) -> dict[str, object]:
    """Acquire an immutable GitHub source state for Phase 3 ingestion."""
    repo = get_github_client(access_token).get_repo(repo_name)
    commit = repo.get_commit(revision_sha)
    files: list[dict[str, str]] = []
    candidates = [
        element
        for element in repo.get_git_tree(commit.sha, recursive=True).tree
        if element.type == "blob"
        and os.path.splitext(element.path)[1].lower() in SUPPORTED_EXTENSIONS
        and getattr(element, "size", 0) <= 1024 * 1024
    ][:MAX_REPO_FILES]

    def fetch(element):
        blob = repo.get_git_blob(element.sha)
        if blob.encoding == "base64":
            content = base64.b64decode(blob.content).decode("utf-8", errors="ignore")
        elif blob.encoding == "utf-8":
            content = blob.content
        else:
            return None
        return {"path": element.path, "content": content}

    with ThreadPoolExecutor(max_workers=MAX_FETCH_WORKERS) as executor:
        files = [file for file in executor.map(fetch, candidates) if file is not None]
    digest = hashlib.sha256()
    for file in sorted(files, key=lambda item: item["path"]):
        digest.update(file["path"].encode("utf-8"))
        digest.update(b"\0")
        digest.update(file["content"].encode("utf-8"))
        digest.update(b"\0")
    return {"revision_sha": commit.sha, "snapshot_hash": digest.hexdigest(), "files": files}
