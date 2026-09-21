import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

describe("Developer Ecosystem Distribution Suite (CLI & Homebrew & VS Code)", () => {
  const cliRoot = path.resolve(__dirname, "../../../cli");
  const vscodeRoot = path.resolve(__dirname, "../../../vscode-extension");
  const formulaFile = path.resolve(__dirname, "../../../Formula/anuvaad.rb");

  it("CLI package.json has valid bin executables and MIT license", () => {
    const pkgPath = path.join(cliRoot, "package.json");
    expect(fs.existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    expect(pkg.name).toBe("@anuvaad/cli");
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin["anuvaad"]).toBe("./dist/index.js");
    expect(pkg.bin["anuvaad-cli"]).toBe("./dist/index.js");
    expect(pkg.license).toBe("MIT");
  });

  it("CLI executes and outputs version", () => {
    const cliEntry = path.join(cliRoot, "dist/index.js");
    expect(fs.existsSync(cliEntry)).toBe(true);

    const versionOutput = execSync(`node "${cliEntry}" --version`).toString().trim();
    expect(versionOutput).toBe("1.0.0");
  });

  it("CLI executes and outputs help commands", () => {
    const cliEntry = path.join(cliRoot, "dist/index.js");
    const helpOutput = execSync(`node "${cliEntry}" --help`).toString();
    expect(helpOutput).toContain("Anuvaad CLI");
    expect(helpOutput).toContain("explain <file>");
    expect(helpOutput).toContain("translate <file>");
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
