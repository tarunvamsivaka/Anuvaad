/**
 * config.ts — CLI configuration loader.
 *
 * Config priority (highest to lowest):
 * 1. Explicit command-line flags (handled in commands via options)
 * 2. ANUVAAD_API_KEY / ANUVAAD_API_URL environment variables
 * 3. ~/.anuvaad/config.json file
 *
 * Use `anuvaad-cli auth login --api-key <KEY>` to persist credentials
 * to the config file. Use `anuvaad-cli auth status` to inspect current state.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface CliConfig {
  apiKey?: string;
  apiUrl?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.anuvaad');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): CliConfig {
  const config: CliConfig = {};

  // Load from file if it exists
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<CliConfig>;
      if (typeof parsed.apiKey === 'string') config.apiKey = parsed.apiKey;
      if (typeof parsed.apiUrl === 'string') config.apiUrl = parsed.apiUrl;
    }
  } catch {
    // Ignore parse/FS errors silently
  }

  // Environment variables take priority over file
  if (process.env['ANUVAAD_API_KEY']) config.apiKey = process.env['ANUVAAD_API_KEY'];
  if (process.env['ANUVAAD_API_URL']) config.apiUrl = process.env['ANUVAAD_API_URL'];

  return config;
}

export function saveConfig(updates: Partial<CliConfig>): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const existing = loadConfigFromFile();
    const merged = { ...existing, ...updates };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + '\n', { mode: 0o600 });
  } catch (err) {
    throw new Error(`Failed to save config: ${(err as Error).message}`);
  }
}

function loadConfigFromFile(): CliConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as CliConfig;
    }
  } catch {
    // ignore
  }
  return {};
}

/** Extension-to-language mapping (mirrors app/core/config.py EXTENSION_TO_LANGUAGE). */
export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.py': 'python',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.jsx': 'javascript',
  '.tsx': 'typescript',
  '.java': 'java',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.rs': 'rust',
  '.go': 'go',
  '.c': 'c',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.r': 'r',
  '.sh': 'bash',
  '.sql': 'sql',
  '.html': 'html',
  '.css': 'css',
  '.scala': 'scala',
  '.dart': 'dart',
  '.lua': 'lua',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.clj': 'clojure',
};

/** Detect source language from a file path based on extension. */
export function detectLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext];
}
