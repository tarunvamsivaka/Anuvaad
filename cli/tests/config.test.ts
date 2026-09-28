import { detectLanguage, EXTENSION_TO_LANGUAGE } from "../src/config";

describe("CLI Configuration & Language Detection", () => {
  it("detects languages correctly from file extensions", () => {
    expect(detectLanguage("app/main.py")).toBe("python");
    expect(detectLanguage("src/index.ts")).toBe("typescript");
    expect(detectLanguage("server.go")).toBe("go");
    expect(detectLanguage("main.rs")).toBe("rust");
    expect(detectLanguage("unknown.xyz")).toBeUndefined();
  });

  it("contains major enterprise languages in EXTENSION_TO_LANGUAGE map", () => {
    expect(EXTENSION_TO_LANGUAGE[".py"]).toBe("python");
    expect(EXTENSION_TO_LANGUAGE[".java"]).toBe("java");
    expect(EXTENSION_TO_LANGUAGE[".ts"]).toBe("typescript");
    expect(EXTENSION_TO_LANGUAGE[".go"]).toBe("go");
    expect(EXTENSION_TO_LANGUAGE[".cpp"]).toBe("cpp");
  });
});
