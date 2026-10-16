import { describe, it, expect, vi } from 'vitest';
import {
  parseGithubUrl,
  detectLanguageFromFilename,
  fetchGithubFileContent,
  parsePullRequestUrl,
} from '../lib/github-import';

describe('GitHub Raw URL Ingestion & Security Validation', () => {
  it('parses GitHub blob URLs and constructs raw content URLs', () => {
    const blobUrl = 'https://github.com/tarunvamsivaka/Anuvaad/blob/master/app/core/cache.py';
    const parsed = parseGithubUrl(blobUrl);

    expect(parsed.owner).toBe('tarunvamsivaka');
    expect(parsed.repo).toBe('Anuvaad');
    expect(parsed.branch).toBe('master');
    expect(parsed.filePath).toBe('app/core/cache.py');
    expect(parsed.filename).toBe('cache.py');
    expect(parsed.extension).toBe('.py');
    expect(parsed.rawUrl).toBe(
      'https://raw.githubusercontent.com/tarunvamsivaka/Anuvaad/master/app/core/cache.py'
    );
  });

  it('parses direct raw.githubusercontent.com URLs', () => {
    const rawUrl = 'https://raw.githubusercontent.com/facebook/react/main/packages/react/index.js';
    const parsed = parseGithubUrl(rawUrl);

    expect(parsed.owner).toBe('facebook');
    expect(parsed.repo).toBe('react');
    expect(parsed.branch).toBe('main');
    expect(parsed.filename).toBe('index.js');
    expect(parsed.extension).toBe('.js');
    expect(parsed.rawUrl).toBe(rawUrl);
  });

  it('enforces strict SSRF security allowlist by rejecting non-GitHub domains', () => {
    expect(() => parseGithubUrl('https://malicious-site.com/blob/master/file.py')).toThrow(
      /Only github.com and raw.githubusercontent.com are allowed/
    );

    expect(() => parseGithubUrl('http://localhost:8000/cache.py')).toThrow(
      /Only github.com and raw.githubusercontent.com are allowed/
    );

    expect(() => parseGithubUrl('http://169.254.169.254/latest/meta-data/')).toThrow(
      /Only github.com and raw.githubusercontent.com are allowed/
    );

    expect(() => parseGithubUrl('not-a-valid-url')).toThrow(/Malformed URL format/);
  });

  it('detects language accurately from file extensions', () => {
    expect(detectLanguageFromFilename('main.py')).toBe('python');
    expect(detectLanguageFromFilename('App.tsx')).toBe('typescript');
    expect(detectLanguageFromFilename('engine.ts')).toBe('typescript');
    expect(detectLanguageFromFilename('script.js')).toBe('javascript');
    expect(detectLanguageFromFilename('lib.rs')).toBe('rust');
    expect(detectLanguageFromFilename('server.go')).toBe('go');
    expect(detectLanguageFromFilename('Main.java')).toBe('java');
    expect(detectLanguageFromFilename('algo.cpp')).toBe('cpp');
  });

  it('fetches file content successfully using fetchGithubFileContent', async () => {
    const mockCode = 'print("Hello from GitHub!")';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => mockCode,
    } as Response);

    const result = await fetchGithubFileContent(
      'https://raw.githubusercontent.com/test/repo/main/hello.py'
    );

    expect(result.content).toBe(mockCode);
    expect(result.byteSize).toBe(mockCode.length);
    fetchSpy.mockRestore();
  });

  it('handles 404 responses gracefully with descriptive error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    await expect(
      fetchGithubFileContent('https://raw.githubusercontent.com/test/repo/main/missing.py')
    ).rejects.toThrow(/File not found on GitHub \(404\)/);

    fetchSpy.mockRestore();
  });

  it('parses GitHub Pull Request URLs', () => {
    const prResult = parsePullRequestUrl('https://github.com/tarunvamsivaka/Anuvaad/pull/42');
    expect(prResult.type).toBe('pull_request');
    expect(prResult.owner).toBe('tarunvamsivaka');
    expect(prResult.repo).toBe('Anuvaad');
    expect(prResult.prNumber).toBe(42);
    expect(prResult.apiUrl).toBe('https://api.github.com/repos/tarunvamsivaka/Anuvaad/pulls/42');
  });

  it('rejects non-github.com domains in PR URL parser', () => {
    expect(() => parsePullRequestUrl('https://evil.com/owner/repo/pull/1')).toThrow(
      /Only github.com is allowed/
    );
  });

  it('rejects PR URLs without https', () => {
    expect(() => parsePullRequestUrl('http://github.com/owner/repo/pull/1')).toThrow(
      /Only https/
    );
  });
});
