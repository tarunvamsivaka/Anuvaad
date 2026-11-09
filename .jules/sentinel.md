## 2025-05-18 - Validate Download URLs in Third-Party Content Importers
**Vulnerability:** In `/import-gist`, when fetching repo file contents via GitHub API metadata, the `download_url` returned from GitHub was fetched directly without scheme or domain validation.
**Learning:** Upstream API responses may contain unexpected or manipulated URLs; blindly following `download_url` fields can result in Server-Side Request Forgery (SSRF) or fetching internal endpoints.
**Prevention:** Strictly validate that download URLs point to trusted, expected domains (`https://raw.githubusercontent.com/`) before making external HTTP requests.
