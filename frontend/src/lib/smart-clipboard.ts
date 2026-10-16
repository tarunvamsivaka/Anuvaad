/**
 * Smart Clipboard Auto-Detection Engine.
 *
 * Classifies pasted text into semantic categories in < 2ms using
 * deterministic regex heuristics + token-density analysis.
 * Zero async, zero network, zero external dependencies.
 *
 * v1.2.0 — Daily-Driver Workspace Upgrade
 */

export type ClipboardKind =
  | 'diff'
  | 'stacktrace'
  | 'sql'
  | 'json'
  | 'code'
  | 'english';

export interface ClassificationResult {
  kind: ClipboardKind;
  detectedLanguage?: string;
  badgeLabel: string;
  confidence: number;
}

// ── Regex patterns (compiled once at module load) ────────────────────────────

const DIFF_PATTERNS = [
  /^diff --git/m,
  /^@@ -\d+/m,
  /^\+\+\+ b\//m,
  /^--- a\//m,
];

const STACKTRACE_PATTERNS = [
  /^Traceback \(most recent call last\):/m,     // Python
  /^\s+at\s+.+\(.*:\d+:\d+\)/m,               // JS/TS V8
  /^\s+at\s+[A-Z][\w$.]+\.[\w<>()]+/m,         // Java
  /^thread '.*' panicked at/m,                  // Rust
  /^\s+File ".*", line \d+/m,                  // Python (alt)
  /Exception in thread "main"/m,               // Java
  /^\s+[A-Za-z]+Error:/m,                       // Generic Error:
];

const SQL_KEYWORDS = [
  /^\s*(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE|CREATE INDEX|EXPLAIN)/im,
];

const CODE_CHAR_REGEX = /[{}();:=<>\[\]!&|]/g;

// Language detection keyword patterns
const LANGUAGE_SIGNALS: Array<{ lang: string; patterns: RegExp[] }> = [
  {
    lang: 'python',
    patterns: [/\bdef\s+\w+\s*\(/, /\bimport\s+\w/, /^\s*#/, /\bself\b/, /\belif\b/, /print\(/m],
  },
  {
    lang: 'typescript',
    patterns: [/:\s*(string|number|boolean|void|any|unknown)/, /interface\s+\w/, /type\s+\w+\s*=/, /as\s+(const|unknown|any)/, /import.*from\s+'[^']+'/],
  },
  {
    lang: 'javascript',
    patterns: [/const\s+\w+\s*=\s*(async\s+)?\(/, /require\(/, /module\.exports/, /=>/, /\bvar\b/],
  },
  {
    lang: 'rust',
    patterns: [/^\s*fn\s+\w+/m, /\blet\s+mut\b/, /->\s*\w/, /\bimpl\b/, /\bpub\s+fn\b/, /::\b/],
  },
  {
    lang: 'go',
    patterns: [/^\s*func\s+/m, /\bpackage\s+main\b/, /\bfmt\.Print/, /:=/, /^\s*import\s+\(/m],
  },
  {
    lang: 'java',
    patterns: [/public\s+class\s+\w+/, /\bSystem\.out\.print/, /\bpublic\s+static\s+void\s+main/, /@Override/, /\bimport\s+java\./],
  },
  {
    lang: 'cpp',
    patterns: [/#include\s*</, /std::/, /\bnamespace\s+\w+/, /cout\s*<</, /int\s+main\s*\(/],
  },
  {
    lang: 'sql',
    patterns: [/^\s*SELECT\b/im, /^\s*CREATE\s+TABLE\b/im, /^\s*INSERT\s+INTO\b/im],
  },
];

// ── Classifier ───────────────────────────────────────────────────────────────

/**
 * Classifies pasted clipboard text into a semantic kind.
 * Completes synchronously in < 2ms for inputs up to 50KB.
 */
export function classifyClipboardText(text: string): ClassificationResult {
  if (!text || !text.trim()) {
    return { kind: 'english', badgeLabel: 'Empty', confidence: 1.0 };
  }

  const sample = text.slice(0, 4000); // Cap scan at 4KB for speed

  // 1. Unified diff
  const diffScore = DIFF_PATTERNS.filter((p) => p.test(sample)).length;
  if (diffScore >= 2) {
    return { kind: 'diff', detectedLanguage: 'diff', badgeLabel: 'Git Diff', confidence: Math.min(1, diffScore / 3) };
  }

  // 2. Stack trace
  const stackScore = STACKTRACE_PATTERNS.filter((p) => p.test(sample)).length;
  if (stackScore >= 1) {
    const lang = /Traceback|File ".*\.py"/.test(sample) ? 'python'
      : /thread '.*' panicked/.test(sample) ? 'rust'
      : /Exception in thread|at.*\.java/.test(sample) ? 'java'
      : 'javascript';
    return {
      kind: 'stacktrace',
      detectedLanguage: lang,
      badgeLabel: `${lang.charAt(0).toUpperCase() + lang.slice(1)} Stack Trace`,
      confidence: Math.min(1, stackScore / 2),
    };
  }

  // 3. SQL
  if (SQL_KEYWORDS.some((p) => p.test(sample))) {
    return { kind: 'sql', detectedLanguage: 'sql', badgeLabel: 'SQL Query', confidence: 0.9 };
  }

  // 4. JSON
  const trimmedSample = sample.trim();
  if ((trimmedSample.startsWith('{') || trimmedSample.startsWith('[')) && trimmedSample.length > 2) {
    try {
      JSON.parse(trimmedSample);
      return { kind: 'json', detectedLanguage: 'json', badgeLabel: 'JSON Payload', confidence: 0.95 };
    } catch {
      // Not valid JSON
    }
  }

  // 5. Code vs. English (token density heuristic)
  const codeChars = (sample.match(CODE_CHAR_REGEX) || []).length;
  const density = codeChars / sample.length;

  if (density > 0.05) {
    // Looks like code — detect language
    let bestLang = 'code';
    let bestScore = 0;

    for (const { lang, patterns } of LANGUAGE_SIGNALS) {
      const score = patterns.filter((p) => p.test(sample)).length;
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }

    const label = bestScore > 0
      ? `${bestLang.charAt(0).toUpperCase() + bestLang.slice(1)} Code`
      : 'Source Code';

    return {
      kind: 'code',
      detectedLanguage: bestScore > 0 ? bestLang : undefined,
      badgeLabel: label,
      confidence: Math.min(0.95, 0.5 + density * 4),
    };
  }

  // 6. English / natural language
  return {
    kind: 'english',
    badgeLabel: 'Natural Language',
    confidence: 0.7,
  };
}
