import os
import structlog
from github import Github, Auth
from typing import List, Dict

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

def fetch_repository_files(repo_name: str) -> List[Dict[str, str]]:
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
                        import base64
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
