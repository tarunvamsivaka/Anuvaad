export const EXT_TO_LANGUAGE: Record<string, string> = {
  ".py": "python",
  ".js": "javascript",
  ".ts": "typescript",
  ".java": "java",
  ".cpp": "cpp",
  ".rs": "rust",
  ".go": "go",
  ".c": "c",
  ".cs": "csharp",
};

export const ACCEPTED_EXTENSIONS = Object.keys(EXT_TO_LANGUAGE);

export function detectLanguage(code: string): string | null {
  if (!code || code.trim().length < 15) return null;
  
  // 1. Python: def statement, import, print statement without semicolons, snake_case
  if (/def\s+[a-zA-Z_]\w*\s*\(|import\s+[a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*\n|#\s+.*|elif\s+|if\s+__name__\s*==\s*['"]__main__['"]/.test(code)) {
    return "python";
  }
  
  // 2. TypeScript / JavaScript React: import React, interface / type (TS), const [x, setX] = useState
  if (/import\s+.*\s+from\s+['"]react['"]|const\s+\[\w+,\s*set\w+\]\s*=\s*useState|export\s+default\s+function|interface\s+[A-Z]\w*\s*\{|type\s+[A-Z]\w*\s*=/.test(code)) {
    return "typescript";
  }
  
  // 3. JavaScript: console.log, function, let/const, arrow functions
  if (/console\.log\(|const\s+\w+\s*=\s*\(.*\)\s*=>|let\s+\w+\s*=|var\s+\w+\s*=/.test(code)) {
    return "javascript";
  }

  // 4. Rust: fn main, pub struct, impl, let mut, use std
  if (/fn\s+main\(\)|pub\s+struct\s+[A-Z]|impl\s+[A-Z]|let\s+mut\s+\w+|use\s+std::/.test(code)) {
    return "rust";
  }

  // 5. C++: #include, std::cout, int main, class, namespace
  if (/#include\s*<[a-z]+>|std::cout|int\s+main\(\s*\)|using\s+namespace\s+std;/.test(code)) {
    return "cpp";
  }

  // 6. Go: package main, func main, import (, fmt.Println
  if (/package\s+main|func\s+main\(\)|import\s*\(\n|fmt\.Println/.test(code)) {
    return "go";
  }

  // 7. Java: public class, public static void main, System.out.println
  if (/public\s+class\s+[A-Z]|public\s+static\s+void\s+main|System\.out\.println/.test(code)) {
    return "java";
  }

  return null;
}
