export const languages: { value: string; label: string; monacoId: string }[] = [
  // Web
  { value: "html", label: "HTML", monacoId: "html" },
  { value: "css", label: "CSS", monacoId: "css" },
  { value: "javascript", label: "JavaScript", monacoId: "javascript" },
  { value: "typescript", label: "TypeScript", monacoId: "typescript" },
  // Systems
  { value: "python", label: "Python", monacoId: "python" },
  { value: "java", label: "Java", monacoId: "java" },
  { value: "cpp", label: "C++", monacoId: "cpp" },
  { value: "c", label: "C", monacoId: "c" },
  { value: "csharp", label: "C#", monacoId: "csharp" },
  { value: "go", label: "Go", monacoId: "go" },
  { value: "rust", label: "Rust", monacoId: "rust" },
  // Mobile & App
  { value: "swift", label: "Swift", monacoId: "swift" },
  { value: "kotlin", label: "Kotlin", monacoId: "kotlin" },
  { value: "dart", label: "Dart", monacoId: "dart" },
  { value: "objective-c", label: "Objective-C", monacoId: "objective-c" },
  // Scripting
  { value: "php", label: "PHP", monacoId: "php" },
  { value: "ruby", label: "Ruby", monacoId: "ruby" },
  { value: "perl", label: "Perl", monacoId: "perl" },
  { value: "lua", label: "Lua", monacoId: "lua" },
  { value: "r", label: "R", monacoId: "r" },
  { value: "matlab", label: "MATLAB", monacoId: "matlab" },
  // Data & Query
  { value: "sql", label: "SQL", monacoId: "sql" },
  { value: "graphql", label: "GraphQL", monacoId: "graphql" },
  // Shell & DevOps
  { value: "bash", label: "Bash / Shell", monacoId: "shell" },
  { value: "powershell", label: "PowerShell", monacoId: "powershell" },
  { value: "dockerfile", label: "Dockerfile", monacoId: "dockerfile" },
  { value: "yaml", label: "YAML", monacoId: "yaml" },
  // Functional & Other
  { value: "scala", label: "Scala", monacoId: "scala" },
  { value: "haskell", label: "Haskell", monacoId: "haskell" },
  { value: "elixir", label: "Elixir", monacoId: "elixir" },
  { value: "clojure", label: "Clojure", monacoId: "clojure" },
  // Markup & Config
  { value: "json", label: "JSON", monacoId: "json" },
  { value: "xml", label: "XML", monacoId: "xml" },
  { value: "markdown", label: "Markdown", monacoId: "markdown" },
  // Assembly
  { value: "assembly", label: "Assembly", monacoId: "mips" },
];

export const EXT_TO_LANGUAGE: Record<string, string> = {
  ".py": "python", ".js": "javascript", ".ts": "typescript",
  ".java": "java", ".cpp": "cpp", ".rs": "rust",
  ".go": "go", ".c": "c", ".cs": "csharp",
};

export const ACCEPTED_EXTENSIONS = Object.keys(EXT_TO_LANGUAGE);
