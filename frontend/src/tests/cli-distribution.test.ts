/**
 * Developer Ecosystem Distribution Suite (CLI & Homebrew & VS Code)
 * Phase 4 Feature 14 Verification: Confirms package structure, executables, and manifests.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

describe("Developer Ecosystem Distribution Suite (CLI & Homebrew & VS Code)", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const cliRoot = path.join(repoRoot, "cli");
  const vscodeRoot = path.join(repoRoot, "vscode-extension");
  const formulaFile = path.join(repoRoot, "Formula/anuvaad.rb");
  const cliPkg = JSON.parse(fs.readFileSync(path.join(cliRoot, "package.json"), "utf-8"));

  it("CLI package.json has valid bin executables and MIT license", () => {
    const pkgPath = path.join(cliRoot, "package.json");
    expect(fs.existsSync(pkgPath)).toBe(true);

    expect(cliPkg.name).toBe("@anuvaad/cli");
    expect(cliPkg.bin).toBeDefined();
    expect(cliPkg.bin["anuvaad"]).toBe("./dist/index.js");
    expect(cliPkg.bin["anuvaad-cli"]).toBe("./dist/index.js");
    expect(cliPkg.license).toBe("MIT");
  });

  it("CLI executes and outputs version", () => {
    const cliEntry = path.join(cliRoot, "dist/index.js");
    expect(fs.existsSync(cliEntry)).toBe(true);

    const versionOutput = execSync(`node "${cliEntry}" --version`).toString().trim();
    expect(versionOutput).toBe(cliPkg.version);
  });

  it("CLI executes and outputs help commands", () => {
    const cliEntry = path.join(cliRoot, "dist/index.js");
    const helpOutput = execSync(`node "${cliEntry}" --help`).toString();
    expect(helpOutput).toContain("Anuvaad CLI");
    expect(helpOutput).toContain("explain <file>");
    expect(helpOutput).toContain("translate <file>");
    expect(helpOutput).toContain("modernize <dir>");
    expect(helpOutput).toContain("verify-receipt <digest_or_file>");
    expect(helpOutput).toContain("--ci-gate");
    expect(helpOutput).toContain("auth login");
  });

  it("Homebrew formula exists and defines standard npm packaging", () => {
    expect(fs.existsSync(formulaFile)).toBe(true);
    const formulaContent = fs.readFileSync(formulaFile, "utf-8");
    expect(formulaContent).toContain("class Anuvaad < Formula");
    expect(formulaContent).toContain("depends_on \"node\"");
    expect(formulaContent).toContain("anuvaad --version");
  });

  it("VS Code extension manifest is valid and configured", () => {
    const vscodePkgPath = path.join(vscodeRoot, "package.json");
    expect(fs.existsSync(vscodePkgPath)).toBe(true);

    const vscodePkg = JSON.parse(fs.readFileSync(vscodePkgPath, "utf-8"));
    expect(vscodePkg.name).toBe("anuvaad-vscode");
    expect(vscodePkg.publisher).toBe("anuvaad");
    expect(vscodePkg.contributes.commands.length).toBeGreaterThan(0);
  });
});
