#!/usr/bin/env node

/**
 * Anuvaad CLI entrypoint (zero-dependency).
 * Translate, explain, and review code from your terminal.
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "./api-client";
import { loadConfig, saveConfig, detectLanguage } from "./config";

function printHelp(): void {
  console.log(`
Anuvaad CLI — AI-powered code translation and explanation

Usage:
  anuvaad-cli <command> [options]

Commands:
  explain <file> [--language <lang>]     Explain code in plain English
  translate <file> --to <target_lang>   Translate code to another language
  auth login --api-key <key>             Save API key to ~/.anuvaad/config.json
  auth status                            Display current authentication state
  health                                 Check Anuvaad API health status
  help                                   Show this help message

Options:
  --language, -l   Source code language (inferred from file extension if omitted)
  --from, -f       Source code language for translation
  --to, -t         Target programming language
  --api-key, -k    Anuvaad API key for authentication
  --help, -h       Show help message
`);
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
    console.log(`Analyzing ${path.basename(file)} (${lang})...`);
    try {
      const client = createClient();
      const result = await client.explainCode(code, lang);
      for (const block of result.blocks) {
        console.log("\n----------------------------------------");
        console.log(`[Code]\n${block.code_snippet}\n`);
        console.log(`[Explanation]\n${block.english_translation}`);
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
    console.log(`Translating ${path.basename(file)} (${fromLang} → ${toLang})...`);
    try {
      const client = createClient();
      const result = await client.translateCode(code, fromLang, toLang);
      for (const block of result.blocks) {
        console.log("\n----------------------------------------");
        console.log(block.code_snippet || block.english_translation);
      }
    } catch (err) {
      console.error("Translation failed:", (err as Error).message);
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
