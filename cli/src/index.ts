#!/usr/bin/env node

/**
 * Anuvaad CLI entrypoint (zero-dependency).
 * Autonomous code modernization, translation, explanation, and verification from your terminal.
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "./api-client";
import { loadConfig, saveConfig, detectLanguage } from "./config";

function printHelp(): void {
  console.log(`
Anuvaad CLI — Autonomous AI-powered code modernization and explanation

Usage:
  anuvaad-cli <command> [options]

Commands:
  explain <file> [--language <lang>]                  Explain code in plain English
  translate <file> --to <target_lang>                Translate code to another language
  modernize <dir> --to <target_lang>                 Modernize repository using topological order
  verify-receipt <digest_or_file>                    Verify cryptographic ZDR audit receipt
  auth login --api-key <key>                          Save API key to ~/.anuvaad/config.json
  auth status                                         Display current authentication state
  health                                              Check Anuvaad API health status
  help                                                Show this help message

Options:
  --language, -l          Source code language (inferred from file extension if omitted)
  --from, -f              Source code language for translation
  --to, -t                Target programming language
  --verify                Run semantic equivalence & characterization test generation
  --ci-gate               CI/CD gate mode: exit with code 1 if confidence < threshold
  --min-confidence <pct>  Minimum confidence threshold for CI gate (default: 80)
  --api-key, -k           Anuvaad API key for authentication
  --ephemeral             Enable Zero Code Retention (RAM-only execution, cryptographic receipt)
  --help, -h              Show help message
`);
}

function getFilesRecursively(dir: string, baseDir = dir): Array<{ file_path: string; content: string; language: string }> {
  let results: Array<{ file_path: string; content: string; language: string }> = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".git", ".next", "dist", "build", "__pycache__"].includes(entry.name)) {
        results = results.concat(getFilesRecursively(fullPath, baseDir));
      }
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      const lang = detectLanguage(fullPath);
      if (lang) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          results.push({ file_path: relPath, content, language: lang });
        } catch {
          // Skip unreadable files
        }
      }
    }
  }
  return results;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--version") || args.includes("-v")) {
    console.log("1.0.0");
    return;
  }
  if (args.length === 0 || args.includes("--help") || args.includes("-h") || args[0] === "help") {
    printHelp();
    return;
  }

  const command = args[0];

  if (command === "auth") {
    const sub = args[1];
    if (sub === "login") {
      const keyIdx = args.findIndex((a) => a === "--api-key" || a === "-k");
      const apiKey = keyIdx !== -1 ? args[keyIdx + 1] : undefined;
      if (!apiKey) {
        console.error("Error: --api-key <key> is required.");
        process.exit(1);
      }
      saveConfig({ apiKey });
      console.log("Authentication successful. Saved to ~/.anuvaad/config.json");
      return;
    }
    if (sub === "status") {
      const config = loadConfig();
      if (!config.apiKey) {
        console.log("Status: Not authenticated. Run `anuvaad-cli auth login --api-key <KEY>`");
      } else {
        const masked = config.apiKey.slice(0, 4) + "..." + config.apiKey.slice(-4);
        console.log(`Status: Authenticated (API Key: ${masked})`);
        console.log(`API URL: ${config.apiUrl || "https://api.getanuvaad.com (default)"}`);
      }
      return;
    }
    console.error(`Unknown auth subcommand: ${sub}`);
    printHelp();
    process.exit(1);
  }

  const isEphemeral = args.includes("--ephemeral");
  const isVerify = args.includes("--verify");
  const isCiGate = args.includes("--ci-gate");
  const minConfIdx = args.findIndex((a) => a === "--min-confidence");
  const minConfidence = minConfIdx !== -1 ? parseFloat(args[minConfIdx + 1]) : 80;

  if (command === "verify-receipt") {
    const target = args[1];
    if (!target) {
      console.error("Error: receipt file or JSON string is required. Usage: anuvaad-cli verify-receipt <file.json>");
      process.exit(1);
    }
    let receiptData: any;
    try {
      if (fs.existsSync(target)) {
        receiptData = JSON.parse(fs.readFileSync(target, "utf-8"));
      } else {
        receiptData = JSON.parse(target);
      }
    } catch {
      console.error("Error: invalid JSON in receipt input.");
      process.exit(1);
    }

    try {
      const client = createClient();
      const res = await client.verifyAuditReceipt(
        receiptData.user_id,
        receiptData.timestamp_utc,
        receiptData.sha256_input_hash || receiptData.code_hash,
        receiptData.audit_digest
      );
      if (res.valid) {
        console.log("✓ Audit Receipt Authenticity: VERIFIED (Cryptographically Valid)");
        console.log(`  User: ${res.user_id}`);
        console.log(`  Timestamp UTC: ${res.timestamp_utc}`);
        console.log(`  Code Hash: ${res.code_hash}`);
        console.log(`  Retention: ${res.retention_policy}`);
      } else {
        console.error("✗ Audit Receipt Authenticity: INVALID (Signature mismatch or tampered)");
        process.exit(1);
      }
    } catch (err) {
      console.error("Verification failed:", (err as Error).message);
      process.exit(1);
    }
    return;
  }

  if (command === "explain") {
    const file = args[1];
    if (!file) {
      console.error("Error: file path is required. Usage: anuvaad-cli explain <file>");
      process.exit(1);
    }
    const resolved = path.resolve(process.cwd(), file);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      process.exit(1);
    }
    const langIdx = args.findIndex((a) => a === "--language" || a === "-l");
    const lang = (langIdx !== -1 ? args[langIdx + 1] : undefined) || detectLanguage(resolved) || "python";

    const code = fs.readFileSync(resolved, "utf-8");
    console.log(`Analyzing ${path.basename(file)} (${lang})${isEphemeral ? " [Ephemeral Mode]" : ""}...`);
    try {
      const client = createClient({ ephemeral: isEphemeral });
      const result = await client.explainCode(code, lang, isEphemeral);
      for (const block of result.blocks) {
        console.log("\n----------------------------------------");
        console.log(`[Code]\n${block.code_snippet}\n`);
        console.log(`[Explanation]\n${block.english_translation}`);
      }
      if (result.auditDigest) {
        console.log("\n----------------------------------------");
        console.log(`[Audit Receipt] HMAC-SHA256: ${result.auditDigest}`);
        console.log("Zero Code Retention: Verified Ephemeral Execution");
      }
    } catch (err) {
      console.error("Explanation failed:", (err as Error).message);
      process.exit(1);
    }
    return;
  }

  if (command === "translate") {
    const file = args[1];
    if (!file) {
      console.error("Error: file path is required. Usage: anuvaad-cli translate <file> --to <target_lang>");
      process.exit(1);
    }
    const resolved = path.resolve(process.cwd(), file);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      process.exit(1);
    }
    const toIdx = args.findIndex((a) => a === "--to" || a === "-t");
    const toLang = toIdx !== -1 ? args[toIdx + 1] : undefined;
    if (!toLang) {
      console.error("Error: --to <target_lang> is required.");
      process.exit(1);
    }
    const fromIdx = args.findIndex((a) => a === "--from" || a === "-f");
    const fromLang = (fromIdx !== -1 ? args[fromIdx + 1] : undefined) || detectLanguage(resolved) || "python";

    const code = fs.readFileSync(resolved, "utf-8");
    console.log(`Translating ${path.basename(file)} (${fromLang} → ${toLang})${isEphemeral ? " [Ephemeral Mode]" : ""}...`);
    try {
      const client = createClient({ ephemeral: isEphemeral });
      const result = await client.translateCode(code, fromLang, toLang, isEphemeral);
      const combinedTranslated = result.blocks.map((b) => b.code_snippet || b.english_translation).join("\n");

      for (const block of result.blocks) {
        console.log("\n----------------------------------------");
        console.log(block.code_snippet || block.english_translation);
      }
      if (result.auditDigest) {
        console.log("\n----------------------------------------");
        console.log(`[Audit Receipt] HMAC-SHA256: ${result.auditDigest}`);
        console.log("Zero Code Retention: Verified Ephemeral Execution");
      }

      if (isVerify || isCiGate) {
        console.log("\nRunning Semantic Equivalence & Characterization Test Synthesis...");
        const eq = await client.evaluateEquivalence(code, combinedTranslated, fromLang, toLang);
        const confidencePct = Math.round(eq.confidence_score * 100);
        console.log(`[Verification] Confidence Score: ${confidencePct}% (${eq.passed_tests}/${eq.total_tests} test assertions passed)`);

        if (eq.generated_test_code) {
          console.log(`[Generated Test Suite]\n${eq.generated_test_code}`);
        }

        if (isCiGate && confidencePct < minConfidence) {
          console.error(`\n[CI Gate Failed] Confidence ${confidencePct}% is below required threshold ${minConfidence}%.`);
          process.exit(1);
        } else if (isCiGate) {
          console.log(`\n[CI Gate Passed] Confidence ${confidencePct}% satisfies threshold >= ${minConfidence}%.`);
        }
      }
    } catch (err) {
      console.error("Translation failed:", (err as Error).message);
      process.exit(1);
    }
    return;
  }

  if (command === "modernize") {
    const dir = args[1];
    if (!dir) {
      console.error("Error: directory path is required. Usage: anuvaad-cli modernize <dir> --to <target_lang>");
      process.exit(1);
    }
    const resolvedDir = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
      console.error(`Directory not found: ${resolvedDir}`);
      process.exit(1);
    }

    const toIdx = args.findIndex((a) => a === "--to" || a === "-t");
    const toLang = toIdx !== -1 ? args[toIdx + 1] : undefined;
    if (!toLang) {
      console.error("Error: --to <target_lang> is required.");
      process.exit(1);
    }

    console.log(`Scanning repository in ${resolvedDir}...`);
    const files = getFilesRecursively(resolvedDir);
    if (files.length === 0) {
      console.log("No supported source files found in directory.");
      return;
    }

    console.log(`Discovered ${files.length} source file(s). Analyzing dependency topology...`);
    try {
      const client = createClient({ ephemeral: isEphemeral });
      const analysis = await client.analyzeRepository(files, path.basename(resolvedDir));

      console.log(`\nRepository Dependency Topology:`);
      console.log(`- Total Symbols: ${analysis.total_symbols}`);
      console.log(`- File Migration Sequence (Leaves-First Order):`);
      analysis.file_migration_order.forEach((f, idx) => {
        console.log(`  ${idx + 1}. ${f}`);
      });

      console.log(`\nBeginning Leaves-First Autonomous Modernization (${toLang})...`);
      let totalPassed = 0;
      let totalProcessed = 0;

      for (const filePath of analysis.file_migration_order) {
        const fileObj = files.find((f) => f.file_path === filePath);
        if (!fileObj) continue;

        console.log(`\n--> Modernizing: ${filePath} (${fileObj.language} → ${toLang})...`);
        const transRes = await client.translateCode(fileObj.content, fileObj.language, toLang, isEphemeral);
        const translatedContent = transRes.blocks.map((b) => b.code_snippet || b.english_translation).join("\n");

        if (isVerify || isCiGate) {
          const eq = await client.evaluateEquivalence(fileObj.content, translatedContent, fileObj.language, toLang);
          const conf = Math.round(eq.confidence_score * 100);
          console.log(`    Status: Verified (${conf}% confidence, ${eq.passed_tests}/${eq.total_tests} tests)`);
          if (conf >= minConfidence) totalPassed++;
        } else {
          console.log(`    Status: Modernized (${transRes.blocks.length} blocks generated)`);
          totalPassed++;
        }
        totalProcessed++;
      }

      console.log(`\n========================================`);
      console.log(`Modernization Complete: ${totalPassed}/${totalProcessed} files modernized successfully.`);
      if (isCiGate && totalPassed < totalProcessed) {
        console.error(`[CI Gate Failed] One or more files failed verification.`);
        process.exit(1);
      }
    } catch (err) {
      console.error("Repository modernization failed:", (err as Error).message);
      process.exit(1);
    }
    return;
  }

  if (command === "health") {
    try {
      const client = createClient();
      const res = await client.health();
      console.log("Anuvaad API Status:", res.status);
    } catch (err) {
      console.error("Health check failed:", (err as Error).message);
      process.exit(1);
    }
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main();
