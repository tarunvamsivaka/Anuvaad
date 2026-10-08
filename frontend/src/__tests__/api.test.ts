import { describe, it, expect, vi, beforeEach } from "vitest";
import { translateCode, verifyReceipt, createGithubPullRequest } from "../lib/api";

describe("API Client Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should post translation payload and return response", async () => {
    const mockResponse = {
      translated_code: "export function hello() {}",
      source_language: "python",
      target_language: "typescript",
      ast_valid: true,
      symbols_validated: ["hello"],
      zdr_receipt: {
        audit_digest: "digest123",
        source_code_hash: "hash123",
        timestamp: 123456,
        user_id: "u1",
        ephemeral_lifecycle_ms: 10,
        zero_retention_guaranteed: true,
      },
      inference_tier: "Tier 1",
      latency_ms: 15,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const result = await translateCode({
      source_code: "def hello(): pass",
      source_language: "python",
      target_language: "typescript",
    });

    expect(result.ast_valid).toBe(true);
    expect(result.translated_code).toBe("export function hello() {}");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/translate"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("should post receipt verification and return verification status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ verified: true, message: "Valid signature" }),
    } as any);

    const result = await verifyReceipt({
      audit_digest: "digest123",
      source_code_hash: "hash123",
      timestamp: 123456,
      user_id: "u1",
      ephemeral_lifecycle_ms: 10,
      zero_retention_guaranteed: true,
    });

    expect(result.verified).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/verify-receipt"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("should post github PR payload and return PR metadata", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        pull_request_url: "https://github.com/org/repo/pull/1",
        branch: "anuvaad-modernized",
        files_committed: 3,
        audit_digest: "digest_pr",
        message: "PR created",
      }),
    } as any);

    const result = await createGithubPullRequest({
      import_id: "import_1",
      repository_name: "org/repo",
      target_branch: "anuvaad-modernized",
    });

    expect(result.pull_request_url).toBe("https://github.com/org/repo/pull/1");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/repo/create-pr"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
