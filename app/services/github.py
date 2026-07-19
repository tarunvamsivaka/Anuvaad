import base64
import hashlib
import os

import structlog
from github import Auth, Github

logger = structlog.get_logger(__name__)

SUPPORTED_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".txt", ".json", ".yml", ".yaml",
    ".html", ".css", ".go", ".rs", ".c", ".cpp", ".h", ".hpp", ".java", ".rb", ".php"
}

def get_github_client() -> Github:
    token = os.environ.get("GITHUB_PAT")
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

    for element in tree:
        if element.type == "blob":
            _, ext = os.path.splitext(element.path)
            if ext.lower() in SUPPORTED_EXTENSIONS:
                # Basic size filter to avoid huge files (limit to ~1MB)
                if getattr(element, "size", 0) > 1024 * 1024:
                    continue
                try:
                    blob = repo.get_git_blob(element.sha)
                    if blob.encoding == "base64":
                        content = base64.b64decode(blob.content).decode("utf-8", errors="ignore")
                    elif blob.encoding == "utf-8":
                        content = blob.content
                    else:
                        continue

                    files.append({
                        "path": element.path,
                        "content": content
                    })
                except Exception as e:
                    logger.debug(f"Failed to fetch/decode file: {element.path}", error=str(e))

    logger.info(f"Successfully fetched {len(files)} files from {repo_name}")
    return files


def fetch_repository_snapshot(repo_name: str, revision_sha: str) -> dict[str, object]:
    """Acquire an immutable GitHub source state for Phase 3 ingestion."""
    repo = get_github_client().get_repo(repo_name)
    commit = repo.get_commit(revision_sha)
    files: list[dict[str, str]] = []
    for element in repo.get_git_tree(commit.sha, recursive=True).tree:
        if element.type != "blob" or os.path.splitext(element.path)[1].lower() not in SUPPORTED_EXTENSIONS:
            continue
        if getattr(element, "size", 0) > 1024 * 1024:
            continue
        blob = repo.get_git_blob(element.sha)
        if blob.encoding == "base64":
            content = base64.b64decode(blob.content).decode("utf-8", errors="ignore")
        elif blob.encoding == "utf-8":
            content = blob.content
        else:
            continue
        files.append({"path": element.path, "content": content})
    digest = hashlib.sha256()
    for file in sorted(files, key=lambda item: item["path"]):
        digest.update(file["path"].encode("utf-8"))
        digest.update(b"\0")
        digest.update(file["content"].encode("utf-8"))
        digest.update(b"\0")
    return {"revision_sha": commit.sha, "snapshot_hash": digest.hexdigest(), "files": files}
