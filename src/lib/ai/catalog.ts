export type AICatalogEntry = {
  id: string;
  name: string;
  shortName: string;
  rank: number;
  route: "native" | "openrouter";
  modelQuery?: string;
  featured?: boolean;
};

// Internal Royal Command catalog. Rank is an internal ordering field only.
// Customer-facing UI should show names and availability, not internal scoring methods.
export const AI_CATALOG: AICatalogEntry[] = [
  { id: "openai", name: "ChatGPT", shortName: "GPT", rank: 1, route: "native", featured: true },
  { id: "anthropic", name: "Claude", shortName: "Claude", rank: 2, route: "native", featured: true },
  { id: "google", name: "Gemini", shortName: "Gemini", rank: 3, route: "native", featured: true },
  { id: "xai", name: "Grok", shortName: "Grok", rank: 4, route: "native", featured: true },
  { id: "deepseek", name: "DeepSeek", shortName: "DeepSeek", rank: 5, route: "openrouter", modelQuery: "DeepSeek", featured: true },
  { id: "perplexity", name: "Perplexity", shortName: "Perplexity", rank: 6, route: "native", modelQuery: "Perplexity", featured: true },
  { id: "mistral", name: "Mistral", shortName: "Mistral", rank: 7, route: "openrouter", modelQuery: "Mistral", featured: true },
  { id: "meta", name: "Meta Llama", shortName: "Llama", rank: 8, route: "openrouter", modelQuery: "Llama", featured: true },
  { id: "qwen", name: "Qwen", shortName: "Qwen", rank: 9, route: "openrouter", modelQuery: "Qwen", featured: true },
  { id: "cohere", name: "Cohere", shortName: "Cohere", rank: 10, route: "openrouter", modelQuery: "Command", featured: true },
  { id: "moonshot", name: "Kimi / Moonshot AI", shortName: "Kimi", rank: 11, route: "openrouter", modelQuery: "Kimi", featured: true },
  { id: "minimax", name: "MiniMax", shortName: "MiniMax", rank: 12, route: "openrouter", modelQuery: "MiniMax", featured: true },
  { id: "zai", name: "Z.ai / GLM", shortName: "GLM", rank: 13, route: "openrouter", modelQuery: "GLM" },
  { id: "microsoft", name: "Microsoft Phi", shortName: "Phi", rank: 14, route: "openrouter", modelQuery: "Phi" },
  { id: "amazon", name: "Amazon Nova", shortName: "Nova", rank: 15, route: "openrouter", modelQuery: "Nova" },
  { id: "nvidia", name: "NVIDIA Nemotron", shortName: "Nemotron", rank: 16, route: "openrouter", modelQuery: "Nemotron" },
  { id: "ai21", name: "AI21", shortName: "AI21", rank: 17, route: "openrouter", modelQuery: "Jamba" },
  { id: "nous", name: "Nous Research", shortName: "Nous", rank: 18, route: "openrouter", modelQuery: "Nous" },
  { id: "writer", name: "Writer", shortName: "Writer", rank: 19, route: "openrouter", modelQuery: "Palmyra" },
  { id: "stepfun", name: "StepFun", shortName: "Step", rank: 20, route: "openrouter", modelQuery: "Step" },
  { id: "inception", name: "Inception", shortName: "Mercury", rank: 21, route: "openrouter", modelQuery: "Mercury" },
  { id: "liquid", name: "Liquid AI", shortName: "Liquid", rank: 22, route: "openrouter", modelQuery: "LFM" },
  { id: "arcee", name: "Arcee AI", shortName: "Arcee", rank: 23, route: "openrouter", modelQuery: "Arcee" },
  { id: "zeroone", name: "01.AI", shortName: "01.AI", rank: 24, route: "openrouter", modelQuery: "Yi" },
  { id: "tencent", name: "Tencent Hunyuan", shortName: "Hunyuan", rank: 25, route: "openrouter", modelQuery: "Hunyuan" },
];

export const AI_CATALOG_BY_ID = Object.fromEntries(
  AI_CATALOG.map((entry) => [entry.id, entry]),
) as Record<string, AICatalogEntry>;
