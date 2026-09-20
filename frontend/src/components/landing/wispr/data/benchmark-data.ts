export interface LanguageBenchmark {
  language: string;
  category: string;
  latency: string;
  accuracy: string;
  concurrencyScore: number;
  tokensPerSec: number;
}

export const BENCHMARK_DATA: LanguageBenchmark[] = [
  // Systems
  { language: "Rust", category: "Systems", latency: "1.42s", accuracy: "99.6%", concurrencyScore: 98, tokensPerSec: 148 },
  { language: "C++", category: "Systems", latency: "1.58s", accuracy: "99.1%", concurrencyScore: 97, tokensPerSec: 139 },
  { language: "C", category: "Systems", latency: "1.22s", accuracy: "99.4%", concurrencyScore: 99, tokensPerSec: 165 },
  { language: "Zig", category: "Systems", latency: "1.49s", accuracy: "98.9%", concurrencyScore: 95, tokensPerSec: 142 },
  { language: "Go", category: "Systems", latency: "1.18s", accuracy: "99.5%", concurrencyScore: 99, tokensPerSec: 162 },
  { language: "Ada", category: "Systems", latency: "1.78s", accuracy: "98.7%", concurrencyScore: 94, tokensPerSec: 128 },

  // Backend / Cloud
  { language: "Java", category: "Backend / Cloud", latency: "1.62s", accuracy: "99.3%", concurrencyScore: 96, tokensPerSec: 135 },
  { language: "C#", category: "Backend / Cloud", latency: "1.49s", accuracy: "99.2%", concurrencyScore: 96, tokensPerSec: 140 },
  { language: "Node.js", category: "Backend / Cloud", latency: "1.28s", accuracy: "99.4%", concurrencyScore: 95, tokensPerSec: 156 },
  { language: "Scala", category: "Backend / Cloud", latency: "1.82s", accuracy: "98.8%", concurrencyScore: 93, tokensPerSec: 125 },
  { language: "Kotlin Server", category: "Backend / Cloud", latency: "1.55s", accuracy: "99.2%", concurrencyScore: 95, tokensPerSec: 138 },
  { language: "Ruby on Rails", category: "Backend / Cloud", latency: "1.64s", accuracy: "98.9%", concurrencyScore: 92, tokensPerSec: 134 },
  { language: "PHP", category: "Backend / Cloud", latency: "1.41s", accuracy: "98.7%", concurrencyScore: 94, tokensPerSec: 144 },

  // Fullstack / Web
  { language: "TypeScript", category: "Fullstack / Web", latency: "1.25s", accuracy: "99.4%", concurrencyScore: 95, tokensPerSec: 154 },
  { language: "JavaScript", category: "Fullstack / Web", latency: "1.19s", accuracy: "99.5%", concurrencyScore: 96, tokensPerSec: 159 },
  { language: "HTML5/CSS3", category: "Fullstack / Web", latency: "0.95s", accuracy: "99.8%", concurrencyScore: 99, tokensPerSec: 175 },
  { language: "Svelte", category: "Fullstack / Web", latency: "1.21s", accuracy: "99.2%", concurrencyScore: 96, tokensPerSec: 155 },
  { language: "Vue", category: "Fullstack / Web", latency: "1.26s", accuracy: "99.3%", concurrencyScore: 95, tokensPerSec: 152 },
  { language: "GraphQL", category: "Fullstack / Web", latency: "0.92s", accuracy: "99.7%", concurrencyScore: 98, tokensPerSec: 178 },

  // AI / Data / Scripting
  { language: "Python", category: "AI / Data / Scripting", latency: "1.34s", accuracy: "99.7%", concurrencyScore: 94, tokensPerSec: 150 },
  { language: "SQL", category: "AI / Data / Scripting", latency: "0.88s", accuracy: "99.8%", concurrencyScore: 99, tokensPerSec: 180 },
  { language: "R", category: "AI / Data / Scripting", latency: "1.72s", accuracy: "98.6%", concurrencyScore: 91, tokensPerSec: 130 },
  { language: "Julia", category: "AI / Data / Scripting", latency: "1.61s", accuracy: "98.8%", concurrencyScore: 93, tokensPerSec: 136 },
  { language: "Bash/Shell", category: "AI / Data / Scripting", latency: "1.04s", accuracy: "99.3%", concurrencyScore: 97, tokensPerSec: 168 },
  { language: "PowerShell", category: "AI / Data / Scripting", latency: "1.38s", accuracy: "98.9%", concurrencyScore: 93, tokensPerSec: 145 },

  // Mobile
  { language: "Kotlin Android", category: "Mobile", latency: "1.45s", accuracy: "99.2%", concurrencyScore: 95, tokensPerSec: 142 },
  { language: "Swift", category: "Mobile", latency: "1.52s", accuracy: "99.0%", concurrencyScore: 93, tokensPerSec: 138 },
  { language: "Flutter / Dart", category: "Mobile", latency: "1.39s", accuracy: "99.1%", concurrencyScore: 94, tokensPerSec: 146 },
  { language: "React Native", category: "Mobile", latency: "1.30s", accuracy: "99.3%", concurrencyScore: 95, tokensPerSec: 152 },
  { language: "Objective-C", category: "Mobile", latency: "1.85s", accuracy: "98.2%", concurrencyScore: 90, tokensPerSec: 122 },

  // DevOps & Infra
  { language: "Terraform HCL", category: "DevOps", latency: "1.12s", accuracy: "99.6%", concurrencyScore: 97, tokensPerSec: 164 },
  { language: "Docker / Dockerfile", category: "DevOps", latency: "0.91s", accuracy: "99.8%", concurrencyScore: 98, tokensPerSec: 176 },
  { language: "Kubernetes YAML", category: "DevOps", latency: "0.98s", accuracy: "99.7%", concurrencyScore: 98, tokensPerSec: 172 },
  { language: "Ansible", category: "DevOps", latency: "1.27s", accuracy: "99.0%", concurrencyScore: 94, tokensPerSec: 149 },

  // Functional & Legacy
  { language: "Elixir", category: "Functional", latency: "1.46s", accuracy: "99.2%", concurrencyScore: 98, tokensPerSec: 145 },
  { language: "Haskell", category: "Functional", latency: "1.91s", accuracy: "98.4%", concurrencyScore: 91, tokensPerSec: 120 },
  { language: "COBOL", category: "Legacy Modernization", latency: "2.10s", accuracy: "98.1%", concurrencyScore: 89, tokensPerSec: 115 },
  { language: "Fortran", category: "Legacy Modernization", latency: "1.98s", accuracy: "98.3%", concurrencyScore: 90, tokensPerSec: 118 },
];
