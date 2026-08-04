export interface LLMModel {
  id: string;
  name: string;
  provider: "Groq" | "DeepSeek" | "OpenRouter" | "Auto";
  badge: string;
  description: string;
}

export const LLM_MODELS: LLMModel[] = [
  {
    id: "auto",
    name: "Auto (Optimal)",
    provider: "Auto",
    badge: "Recommended",
    description: "Automatically selects fastest available LLM model",
  },
  {
    id: "groq/llama-3.3-70b-versatile",
    name: "Groq Llama 3.3 70B",
    provider: "Groq",
    badge: "Ultra Fast",
    description: "High performance 70B parameter model via Groq LPU",
  },
  {
    id: "groq/llama-3.1-8b-instant",
    name: "Groq Llama 3.1 8B",
    provider: "Groq",
    badge: "Sub-Second",
    description: "Instant sub-second responses for quick code snippets",
  },
  {
    id: "deepseek/deepseek-coder",
    name: "DeepSeek Coder",
    provider: "DeepSeek",
    badge: "Code Specialist",
    description: "DeepSeek specialized model for code syntax and logic",
  },
  {
    id: "openrouter/anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "OpenRouter",
    badge: "Top Accuracy",
    description: "Anthropic Claude 3.5 Sonnet via OpenRouter",
  },
  {
    id: "openrouter/openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenRouter",
    badge: "Flagship",
    description: "OpenAI GPT-4o multimodal reasoning & architecture",
  },
  {
    id: "openrouter/deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "OpenRouter",
    badge: "Reasoning",
    description: "DeepSeek V3 model via OpenRouter API network",
  },
];
