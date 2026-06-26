/**
 * TEST-02/04 (4.3): Unit tests for the detectLanguage() and EXT_TO_LANGUAGE utilities.
 *
 * These are pure functions extracted from the translate page and are tested
 * in isolation without rendering. This covers the language detection heuristics
 * that drive the auto-detect feature in the translate editor.
 */
import { describe, it, expect } from "vitest";

import { detectLanguage, EXT_TO_LANGUAGE } from "@/lib/detect-language";

// ── Tests ──

describe("detectLanguage()", () => {
  it("returns null for code shorter than 15 characters", () => {
    expect(detectLanguage("x = 1")).toBeNull();
    expect(detectLanguage("")).toBeNull();
  });

  it("detects Python from def statement", () => {
    const code = `def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)`;
    expect(detectLanguage(code)).toBe("python");
  });

  it("detects Python from __main__ guard", () => {
    const code = `if __name__ == '__main__':\n    print('hello world from main guard')`;
    expect(detectLanguage(code)).toBe("python");
  });

  it("detects Python from elif keyword", () => {
    const code = `result = 'high'\nelif x > 10:\n    result = 'medium'\nelse:\n    result = 'low'`;
    expect(detectLanguage(code)).toBe("python");
  });

  it("detects TypeScript from React import", () => {
    const code = `import React from 'react';\nimport { useState } from 'react';\nexport default function App() { return <div>Hello</div>; }`;
    expect(detectLanguage(code)).toBe("typescript");
  });

  it("detects TypeScript from interface definition", () => {
    const code = `interface UserProfile {\n  id: string;\n  name: string;\n  email: string;\n}`;
    expect(detectLanguage(code)).toBe("typescript");
  });

  it("detects TypeScript from useState hook pattern", () => {
    const code = `const [count, setCount] = useState(0);\nconst [name, setName] = useState('');`;
    expect(detectLanguage(code)).toBe("typescript");
  });

  it("detects JavaScript from console.log", () => {
    const code = `console.log('hello world');\nlet x = 42;\nvar name = 'test';`;
    expect(detectLanguage(code)).toBe("javascript");
  });

  it("detects JavaScript from arrow function", () => {
    const code = `const add = (a, b) => a + b;\nconst greet = (name) => \`Hello \${name}!\`;`;
    expect(detectLanguage(code)).toBe("javascript");
  });

  it("detects Rust from fn main()", () => {
    const code = `fn main() {\n    let mut x = 5;\n    println!("x = {}", x);\n}`;
    expect(detectLanguage(code)).toBe("rust");
  });

  it("detects Rust from use std::", () => {
    const code = `use std::collections::HashMap;\nuse std::fmt;\nlet map: HashMap<String, i32> = HashMap::new();`;
    expect(detectLanguage(code)).toBe("rust");
  });

  it("detects C++ from #include", () => {
    const code = `#include <iostream>\nint main() {\n    std::cout << "Hello World" << std::endl;\n    return 0;\n}`;
    expect(detectLanguage(code)).toBe("cpp");
  });

  it("detects C++ from using namespace std", () => {
    const code = `#include <vector>\nusing namespace std;\nint main() { return 0; }`;
    expect(detectLanguage(code)).toBe("cpp");
  });

  it("detects Go from package main", () => {
    const code = `package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, World!")\n}`;
    expect(detectLanguage(code)).toBe("go");
  });

  it("detects Java from public class", () => {
    const code = `public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello!");\n    }\n}`;
    expect(detectLanguage(code)).toBe("java");
  });

  it("returns null for plain English text", () => {
    const code = `This is a long sentence that is not code at all and has no language markers.`;
    expect(detectLanguage(code)).toBeNull();
  });
});

describe("EXT_TO_LANGUAGE mapping", () => {
  it("maps common extensions correctly", () => {
    expect(EXT_TO_LANGUAGE[".py"]).toBe("python");
    expect(EXT_TO_LANGUAGE[".js"]).toBe("javascript");
    expect(EXT_TO_LANGUAGE[".ts"]).toBe("typescript");
    expect(EXT_TO_LANGUAGE[".java"]).toBe("java");
    expect(EXT_TO_LANGUAGE[".rs"]).toBe("rust");
    expect(EXT_TO_LANGUAGE[".go"]).toBe("go");
  });

  it("does not contain unsupported extensions", () => {
    expect(EXT_TO_LANGUAGE[".exe"]).toBeUndefined();
    expect(EXT_TO_LANGUAGE[".png"]).toBeUndefined();
    expect(EXT_TO_LANGUAGE[".pdf"]).toBeUndefined();
  });

  it("all values are non-empty strings", () => {
    for (const [ext, lang] of Object.entries(EXT_TO_LANGUAGE)) {
      expect(typeof lang).toBe("string");
      expect(lang.length).toBeGreaterThan(0);
      expect(ext.startsWith(".")).toBe(true);
    }
  });
});
