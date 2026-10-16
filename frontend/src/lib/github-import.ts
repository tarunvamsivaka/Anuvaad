/**
 * GitHub Raw URL Resolver & Deep-Link Ingestion Utility.
 * Converts public GitHub blob URLs to raw.githubusercontent.com URLs,
 * enforces strict SSRF host allowlisting, and detects programming language.
 * v1.2.0: Added PR URL parsing and unified resolveGitHubSource().
 */

export interface ParsedGithubUrl {
  rawUrl: string;
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  filename: string;
  extension: string;
}

export interface ParsedPullRequestUrl {
  type: 'pull_request';
  owner: string;
  repo: string;
  prNumber: number;
  apiUrl: string;
}

export type ResolvedGitHubSource =
  | { type: 'file'; parsed: ParsedGithubUrl; content: string; language: string }
  | { type: 'diff'; diff: string; title: string; language: string; owner: string; repo: string; prNumber: number };

const ALLOWED_HOSTS = new Set([
  'github.com',
  'raw.githubusercontent.com',
  'api.github.com',
]);

const EXTENSION_MAP: Record<string, string> = {
  '.py': 'python',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.html': 'html',
  '.css': 'css',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.diff': 'diff',
};

/**
 * Validates and converts any public GitHub file URL into a raw content URL.
 * Rejects non-GitHub domains to prevent SSRF and arbitrary host proxying.
 */
export function parseGithubUrl(rawInputUrl: string): ParsedGithubUrl {
  if (!rawInputUrl || typeof rawInputUrl !== 'string') {
    throw new Error('Invalid URL provided.');
  }

  const trimmed = rawInputUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Malformed URL format.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error(`Invalid host '${hostname}'. Only github.com and raw.githubusercontent.com are allowed.`);
  }

  const pathname = parsed.pathname.replace(/^\/+/, '');
  const segments = pathname.split('/');

  if (hostname === 'github.com') {
    if (segments.length < 5 || segments[2] !== 'blob') {
      throw new Error('Expected a GitHub blob file URL, e.g. https://github.com/owner/repo/blob/main/path/to/file.ts');
    }

    const owner = segments[0];
    const repo = segments[1];
    const branch = segments[3];
    const pathParts = segments.slice(4);
    const filePath = pathParts.join('/');
    const filename = pathParts[pathParts.length - 1];
    const extMatch = filename.match(/\.[a-zA-Z0-9]+$/);
    const extension = extMatch ? extMatch[0].toLowerCase() : '';

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

    return { rawUrl, owner, repo, branch, filePath, filename, extension };
  } else if (hostname === 'raw.githubusercontent.com') {
    if (segments.length < 4) {
      throw new Error('Expected a raw GitHub URL, e.g. https://raw.githubusercontent.com/owner/repo/main/file.ts');
    }

    const owner = segments[0];
    const repo = segments[1];
    const branch = segments[2];
    const pathParts = segments.slice(3);
    const filePath = pathParts.join('/');
    const filename = pathParts[pathParts.length - 1];
    const extMatch = filename.match(/\.[a-zA-Z0-9]+$/);
    const extension = extMatch ? extMatch[0].toLowerCase() : '';

    return { rawUrl: trimmed, owner, repo, branch, filePath, filename, extension };
  }

  throw new Error(`Invalid host '${hostname}'. Only github.com and raw.githubusercontent.com are allowed.`);
}

/**
 * Parses a GitHub Pull Request URL.
 * Enforces SSRF allowlist — only github.com accepted.
 */
export function parsePullRequestUrl(inputUrl: string): ParsedPullRequestUrl {
  if (!inputUrl || typeof inputUrl !== 'string') {
    throw new Error('Invalid URL provided.');
  }

  const trimmed = inputUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Malformed URL format.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'github.com') {
    throw new Error(`Invalid host '${hostname}'. Only github.com is allowed for PR URLs.`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only https:// URLs are allowed.');
  }

  const pathname = parsed.pathname.replace(/^\/+/, '');
  const segments = pathname.split('/');

  if (segments.length < 4 || segments[2] !== 'pull') {
    throw new Error('Expected a GitHub PR URL, e.g. https://github.com/owner/repo/pull/123');
  }

  const prNumber = parseInt(segments[3], 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    throw new Error('Invalid PR number in URL.');
  }

  return {
    type: 'pull_request',
    owner: segments[0],
    repo: segments[1],
    prNumber,
    apiUrl: `https://api.github.com/repos/${segments[0]}/${segments[1]}/pulls/${prNumber}`,
  };
}

/**
 * Fetches a GitHub Pull Request as a unified diff.
 */
export async function fetchPullRequestDiff(
  owner: string,
  repo: string,
  prNumber: number,
  timeoutMs: number = 10000
): Promise<{ diff: string; title: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const metaRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/vnd.github.v3+json' },
      }
    );
    clearTimeout(timer);

    if (metaRes.status === 403 || metaRes.status === 429) {
      throw new Error('GitHub API rate limit reached (60 req/hr for unauthenticated). Try again later.');
    }
    if (metaRes.status === 404) {
      throw new Error('Pull Request not found (404). Verify the repository and PR number.');
    }
    if (!metaRes.ok) {
      throw new Error(`GitHub API responded with HTTP status ${metaRes.status}`);
    }

    const meta = await metaRes.json();
    const title: string = meta.title || `PR #${prNumber}`;

    // Fetch the unified diff
    const diffController = new AbortController();
    const diffTimer = setTimeout(() => diffController.abort(), timeoutMs);
    const diffRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        signal: diffController.signal,
        headers: { Accept: 'application/vnd.github.v3.diff' },
      }
    );
    clearTimeout(diffTimer);

    if (!diffRes.ok) {
      throw new Error(`Failed to fetch PR diff: HTTP ${diffRes.status}`);
    }

    const diff = await diffRes.text();
    return { diff, title };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('GitHub request timed out.');
    }
    throw err;
  }
}

/**
 * Detects programming language identifier from a file name or extension.
 */
export function detectLanguageFromFilename(filename: string): string {
  if (!filename) return 'typescript';
  const match = filename.match(/\.[a-zA-Z0-9]+$/);
  if (!match) return 'typescript';
  return EXTENSION_MAP[match[0].toLowerCase()] || 'typescript';
}

/**
 * Fetches the public file content from GitHub Raw.
 */
export async function fetchGithubFileContent(
  rawUrl: string,
  timeoutMs: number = 10000
): Promise<{ content: string; byteSize: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: { Accept: 'text/plain' },
    });

    clearTimeout(timer);

    if (res.status === 404) {
      throw new Error('File not found on GitHub (404). Verify repository, branch, and path.');
    }
    if (!res.ok) {
      throw new Error(`GitHub responded with HTTP status ${res.status}`);
    }

    const content = await res.text();
    return { content, byteSize: new Blob([content]).size };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('GitHub file request timed out.');
    }
    throw err;
  }
}

/**
 * Unified entry point — resolves any GitHub URL (blob file or PR) to source content.
 * This is the primary API used by the translate workspace deep-link loader.
 */
export async function resolveGitHubSource(inputUrl: string): Promise<ResolvedGitHubSource> {
  if (!inputUrl) throw new Error('URL is required.');

  const trimmed = inputUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Malformed URL format.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error(`Invalid host '${hostname}'. Only GitHub domains are allowed.`);
  }

  // Detect PR URL pattern
  const pathname = parsed.pathname.replace(/^\/+/, '');
  const segments = pathname.split('/');
  if (hostname === 'github.com' && segments[2] === 'pull') {
    const pr = parsePullRequestUrl(trimmed);
    const { diff, title } = await fetchPullRequestDiff(pr.owner, pr.repo, pr.prNumber);
    return {
      type: 'diff',
      diff,
      title,
      language: 'diff',
      owner: pr.owner,
      repo: pr.repo,
      prNumber: pr.prNumber,
    };
  }

  // Default: blob file URL
  const fileParsed = parseGithubUrl(trimmed);
  const { content } = await fetchGithubFileContent(fileParsed.rawUrl);
  const language = detectLanguageFromFilename(fileParsed.filename);
  return { type: 'file', parsed: fileParsed, content, language };
}
