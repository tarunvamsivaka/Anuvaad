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
  verification?: {
    structural_similarity: number;
    has_parse_errors: boolean;
    warnings: string[];
  };
}

export interface ExplanationResult {
  blocks: TranslationBlock[];
  model_used?: string;
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

  constructor(config: ApiClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.apiUrl ?? process.env['ANUVAAD_API_URL'] ?? 'https://api.getanuvaad.com').replace(/\/$/, '');
    this.timeout = config.timeout ?? 60_000;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'User-Agent': '@anuvaad/cli/1.0.0',
        },
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

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Translate a code file or snippet to English explanation blocks.
   * Calls POST /api/v1/code-to-english/sync
   */
  async explainCode(code: string, language: string): Promise<ExplanationResult> {
    const blocks = await this.request<TranslationBlock[]>('POST', '/api/v1/code-to-english/sync', {
      raw_code: code,
      language,
    });
    return { blocks: Array.isArray(blocks) ? blocks : [] };
  }

  /**
   * Translate code from one language to another.
   * Calls POST /api/v1/code-to-code
   */
  async translateCode(
    code: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<TranslationResult> {
    const result = await this.request<{ blocks?: TranslationBlock[]; updated_code?: string; model_used?: string } | TranslationBlock[]>(
      'POST',
      '/api/v1/code-to-code',
      {
        raw_code: code,
        language: fromLanguage,
        target_language: toLanguage,
      }
    );

    if (Array.isArray(result)) {
      return { blocks: result };
    }
    const asObj = result as { blocks?: TranslationBlock[]; updated_code?: string; model_used?: string };
    return {
      blocks: asObj.blocks ?? [],
      model_used: asObj.model_used,
    };
  }

  /**
   * Check API connectivity and return the health status.
   */
  async health(): Promise<{ status: string; version?: string }> {
    return this.request<{ status: string; version?: string }>('GET', '/api/health');
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
