/**
 * api-client.ts — Typed HTTP client for the Anuvaad REST API.
 *
 * All network calls funnel through this module. Authentication is via
 * X-API-Key header. Endpoint base URL defaults to https://api.getanuvaad.com
 * and can be overridden via the ANUVAAD_API_URL environment variable.
 */

export interface TranslationBlock {
  id: string;
  code_snippet: string;
  english_translation: string;
  model_used?: string;
  tier?: string;
}

export interface TranslationResult {
  blocks: TranslationBlock[];
  model_used?: string;
  auditDigest?: string | null;
  verification?: {
    structural_similarity: number;
    has_parse_errors: boolean;
    warnings: string[];
  };
}

export interface EquivalenceReport {
  source_language: string;
  target_language: string;
  total_tests: number;
  passed_tests: number;
  confidence_score: number;
  generated_test_code?: string;
  cryptographic_receipt?: {
    user_id: string;
    timestamp_utc: string;
    sha256_input_hash: string;
    retention_policy: string;
    audit_digest: string;
  };
}

export interface AnalyzeRepositoryResponse {
  repository_name?: string;
  total_files: number;
  total_symbols: number;
  symbol_migration_order: string[];
  file_migration_order: string[];
  graph?: Record<string, unknown>;
}

export interface AuditVerifyResponse {
  valid: boolean;
  user_id: string;
  timestamp_utc: string;
  code_hash: string;
  retention_policy: string;
}

export interface ExplanationResult {
  blocks: TranslationBlock[];
  model_used?: string;
  auditDigest?: string | null;
}

export interface SyncBlock {
  id: string;
  code_snippet: string;
  english_translation: string;
}

export interface SyncResult {
  status: string;
  updated_code: string;
  blocks: TranslationBlock[];
  model_used?: string;
  verification?: {
    structural_similarity: number;
    has_parse_errors: boolean;
    warnings: string[];
  };
}

export interface ApiClientConfig {
  apiKey: string;
  apiUrl?: string;
  timeout?: number;
  ephemeral?: boolean;
}

export class AnuvaadApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'AnuvaadApiError';
  }
}

export class AnuvaadApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly ephemeral: boolean;

  constructor(config: ApiClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.apiUrl ?? process.env['ANUVAAD_API_URL'] ?? 'https://api.getanuvaad.com').replace(/\/$/, '');
    this.timeout = config.timeout ?? 60_000;
    this.ephemeral = config.ephemeral ?? false;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    customHeaders?: Record<string, string>
  ): Promise<{ data: T; headers: Headers }> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'User-Agent': '@anuvaad/cli/1.0.0',
        ...(this.ephemeral ? { 'X-Anuvaad-Privacy-Mode': 'ephemeral' } : {}),
        ...customHeaders,
      };

      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        let detail: string | undefined;
        try {
          const err = await response.json() as { detail?: string; message?: string };
          detail = typeof err.detail === 'string' ? err.detail : err.message;
        } catch {
          // ignore JSON parse failure
        }
        throw new AnuvaadApiError(
          response.status,
          detail ?? `HTTP ${response.status}`,
          detail
        );
      }

      const data = await response.json() as T;
      return { data, headers: response.headers };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Translate a code file or snippet to English explanation blocks.
   * Calls POST /api/v1/code-to-english/sync
   */
  async explainCode(code: string, language: string, ephemeral?: boolean): Promise<ExplanationResult> {
    const customHeaders = ephemeral !== undefined ? { 'X-Anuvaad-Privacy-Mode': ephemeral ? 'ephemeral' : 'standard' } : undefined;
    const res = await this.request<TranslationBlock[]>('POST', '/api/v1/code-to-english/sync', {
      raw_code: code,
      language,
    }, customHeaders);
    return {
      blocks: Array.isArray(res.data) ? res.data : [],
      auditDigest: res.headers.get('x-anuvaad-audit-digest') ?? res.headers.get('X-Anuvaad-Audit-Digest'),
    };
  }

  /**
   * Translate code from one language to another.
   * Calls POST /api/v1/code-to-code
   */
  async translateCode(
    code: string,
    fromLanguage: string,
    toLanguage: string,
    ephemeral?: boolean
  ): Promise<TranslationResult> {
    const customHeaders = ephemeral !== undefined ? { 'X-Anuvaad-Privacy-Mode': ephemeral ? 'ephemeral' : 'standard' } : undefined;
    const res = await this.request<{ blocks?: TranslationBlock[]; updated_code?: string; model_used?: string } | TranslationBlock[]>(
      'POST',
      '/api/v1/code-to-code',
      {
        raw_code: code,
        language: fromLanguage,
        target_language: toLanguage,
      },
      customHeaders
    );

    const auditDigest = res.headers.get('x-anuvaad-audit-digest') ?? res.headers.get('X-Anuvaad-Audit-Digest');

    if (Array.isArray(res.data)) {
      return { blocks: res.data, auditDigest };
    }
    const asObj = res.data as { blocks?: TranslationBlock[]; updated_code?: string; model_used?: string };
    return {
      blocks: asObj.blocks ?? [],
      model_used: asObj.model_used,
      auditDigest,
    };
  }

  /**
   * Analyze entire repository ASTs and construct dependency migration order.
   * Calls POST /api/v1/modernize/analyze-repository
   */
  async analyzeRepository(
    files: Array<{ file_path: string; content: string; language?: string }>,
    repositoryName = "repository"
  ): Promise<AnalyzeRepositoryResponse> {
    const res = await this.request<AnalyzeRepositoryResponse>(
      'POST',
      '/api/v1/modernize/analyze-repository',
      {
        repository_name: repositoryName,
        files,
      }
    );
    return res.data;
  }

  /**
   * Evaluate semantic equivalence and synthesize target characterization tests.
   * Calls POST /api/v1/equivalence/evaluate
   */
  async evaluateEquivalence(
    sourceCode: string,
    targetCode: string,
    sourceLanguage: string,
    targetLanguage: string,
    userId = 'anonymous'
  ): Promise<EquivalenceReport> {
    const res = await this.request<EquivalenceReport>(
      'POST',
      '/api/v1/equivalence/evaluate',
      {
        source_code: sourceCode,
        target_code: targetCode,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        user_id: userId,
      }
    );
    return res.data;
  }

  /**
   * Verify cryptographic Zero Code Retention (ZDR) receipt.
   * Calls POST /api/v1/audit/verify
   */
  async verifyAuditReceipt(
    userId: string,
    timestampUtc: string,
    codeHash: string,
    auditDigest: string
  ): Promise<AuditVerifyResponse> {
    const res = await this.request<AuditVerifyResponse>(
      'POST',
      '/api/v1/audit/verify',
      {
        user_id: userId,
        timestamp_utc: timestampUtc,
        code_hash: codeHash,
        audit_digest: auditDigest,
      }
    );
    return res.data;
  }

  /**
   * Check API connectivity and return the health status.
   */
  async health(): Promise<{ status: string; version?: string }> {
    const res = await this.request<{ status: string; version?: string }>('GET', '/api/health');
    return res.data;
  }
}


/**
 * Create an AnuvaadApiClient from environment variables or explicit config.
 * Throws if no API key is found.
 */
export function createClient(overrides?: Partial<ApiClientConfig>): AnuvaadApiClient {
  const apiKey = overrides?.apiKey ?? process.env['ANUVAAD_API_KEY'] ?? loadConfigFileKey();
  if (!apiKey) {
    throw new Error(
      'No Anuvaad API key found.\n' +
      'Set ANUVAAD_API_KEY env var, or run: anuvaad-cli auth login --api-key <KEY>'
    );
  }
  return new AnuvaadApiClient({
    apiKey,
    apiUrl: overrides?.apiUrl ?? process.env['ANUVAAD_API_URL'],
    timeout: overrides?.timeout,
  });
}

/** Load API key from ~/.anuvaad/config.json if it exists. */
function loadConfigFileKey(): string | undefined {
  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const os = require('os') as typeof import('os');
    const configPath = path.join(os.homedir(), '.anuvaad', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { apiKey?: string };
      return config.apiKey;
    }
  } catch {
    // Ignore filesystem errors
  }
  return undefined;
}
