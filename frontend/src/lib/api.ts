/**
 * API client for Anuvaad backend endpoints.
 */

export interface ZdrAuditReceipt {
  audit_digest: string;
  source_code_hash: string;
  timestamp: number;
  user_id: string;
  ephemeral_lifecycle_ms: number;
  zero_retention_guaranteed: boolean;
}

export interface TranslationResponse {
  translated_code: string;
  source_language: string;
  target_language: string;
  ast_valid: boolean;
  symbols_validated: string[];
  zdr_receipt: ZdrAuditReceipt;
  inference_tier: string;
  latency_ms: number;
}

export interface TranslationPayload {
  source_code: string;
  source_language: string;
  target_language: string;
  user_id?: string;
  preserve_comments?: boolean;
  strict_ast_verification?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function translateCode(payload: TranslationPayload): Promise<TranslationResponse> {
  const res = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || `Translation failed with status ${res.status}`);
  }

  return res.json();
}

export async function verifyReceipt(receipt: ZdrAuditReceipt): Promise<{ verified: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/verify-receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(receipt),
  });

  if (!res.ok) {
    throw new Error(`Receipt verification failed with status ${res.status}`);
  }

  return res.json();
}

export interface GithubPrPayload {
  import_id: string;
  repository_name: string;
  target_branch?: string;
  pr_title?: string;
}

export interface GithubPrResponse {
  pull_request_url: string;
  branch: string;
  files_committed: number;
  audit_digest: string;
  message: string;
}

export async function createGithubPullRequest(payload: GithubPrPayload): Promise<GithubPrResponse> {
  const res = await fetch(`${API_BASE}/repo/create-pr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `PR creation failed with status ${res.status}`);
  }

  return res.json();
}
