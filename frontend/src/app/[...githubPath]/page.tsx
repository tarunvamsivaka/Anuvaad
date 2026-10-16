/**
 * GitHub URL Swap Catch-All Route.
 *
 * Intercepts paths shaped like:
 *   /{owner}/{repo}/blob/{branch}/{...file}  → /dashboard/translate?github=<url>
 *   /{owner}/{repo}/pull/{id}               → /dashboard/translate?github=<prUrl>
 *
 * Any other path shape falls through to not-found.
 * This prevents collision with /changelog, /enterprise, /privacy, /terms etc.
 * which do NOT have 4+ segments shaped like an owner/repo/type/... path.
 */
import { redirect, notFound } from 'next/navigation';

interface Props {
  params: Promise<{ githubPath: string[] }>;
}

export default async function GitHubPathRedirect({ params }: Props) {
  const { githubPath } = await params;
  const segments = githubPath ?? [];

  // Need at least /:owner/:repo/:type/:rest...
  if (segments.length < 4) return notFound();

  const [owner, repo, type, ...rest] = segments;

  // Blob file: /:owner/:repo/blob/:branch/:path...
  if (type === 'blob' && rest.length >= 2) {
    const githubUrl = `https://github.com/${owner}/${repo}/blob/${rest.join('/')}`;
    redirect(`/dashboard/translate?github=${encodeURIComponent(githubUrl)}`);
  }

  // Pull request: /:owner/:repo/pull/:id
  if (type === 'pull' && rest.length === 1 && /^\d+$/.test(rest[0])) {
    const prUrl = `https://github.com/${owner}/${repo}/pull/${rest[0]}`;
    redirect(`/dashboard/translate?github=${encodeURIComponent(prUrl)}`);
  }

  return notFound();
}
