# @anuvaad/cli

> AI-powered code translation, explanation, and review — from your terminal.

[![npm version](https://img.shields.io/npm/v/@anuvaad/cli)](https://www.npmjs.com/package/@anuvaad/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Install

```bash
npm install -g @anuvaad/cli
# or run without installing:
npx @anuvaad/cli help
```

## Quick Start

```bash
# Authenticate with your API key (free at getanuvaad.com)
anuvaad auth login --api-key <YOUR_API_KEY>

# Explain what a file does in plain English
anuvaad explain src/api/auth.py

# Translate a Python file to TypeScript
anuvaad translate src/utils.py --to typescript

# Modernize an entire repository
anuvaad modernize ./legacy-java-app --to kotlin

# Verify a Zero Data Retention audit receipt
anuvaad verify-receipt audit-receipt.json
```

## Commands

| Command | Description |
|---------|-------------|
| `explain <file>` | Explain code in plain English |
| `translate <file> --to <lang>` | Translate to another language |
| `modernize <dir> --to <lang>` | Modernize a full repository |
| `verify-receipt <digest>` | Verify cryptographic ZDR audit receipt |
| `auth login --api-key <key>` | Save your API key |
| `auth status` | Show current auth state |
| `health` | Check API connectivity |

## Options

| Flag | Description |
|------|-------------|
| `--language, -l` | Source language (auto-detected from extension) |
| `--to, -t` | Target language for translation |
| `--verify` | Run semantic equivalence verification |
| `--ci-gate` | CI/CD mode: exit 1 if confidence < threshold |
| `--min-confidence <pct>` | Minimum confidence threshold (default: 80) |
| `--ephemeral` | Zero Code Retention mode (cryptographic receipt) |

## Zero Data Retention (ZDR)

Anuvaad is built with privacy by design. Source code streams through volatile RAM only — never logged to disk, training pools, or telemetry pipelines. Every translation generates a cryptographic HMAC-SHA256 audit receipt you can independently verify.

```bash
anuvaad translate auth.py --to typescript --ephemeral
# → Returns translation + audit receipt: sha256:abc123...
anuvaad verify-receipt sha256:abc123...
# → ✓ ZDR guarantee verified
```

## Supported Languages

Python, Go, TypeScript, JavaScript, Rust, Java, Ruby, PHP, C#, Kotlin, Swift, Scala, C, C++, SQL, Lua, Bash, Elixir, Dart, R, Haskell, Zig, COBOL, Fortran, and 350+ more via tree-sitter-language-pack.

## Links

- **Web App**: [getanuvaad.com](https://getanuvaad.com)
- **Docs**: [docs.getanuvaad.com](https://docs.getanuvaad.com)
- **GitHub**: [github.com/anuvaad/anuvaad](https://github.com/anuvaad/anuvaad)
- **Issues**: [github.com/anuvaad/anuvaad/issues](https://github.com/anuvaad/anuvaad/issues)

## License

MIT © Anuvaad
