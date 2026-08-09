export const AI_PROVIDER_IDS = [
  "openai",
  "anthropic",
  "google",
  "xai",
  "deepseek",
  "perplexity",
  "mistral",
  "meta",
  "qwen",
  "cohere",
  "moonshot",
  "minimax",
  "zai",
  "microsoft",
  "amazon",
  "nvidia",
  "ai21",
  "nous",
  "writer",
  "stepfun",
  "inception",
  "liquid",
  "arcee",
  "zeroone",
  "tencent",
] as const;

export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIProviderResponse {
  provider: AIProviderId;
  model: string;
  content: string;
  latencyMs: number;
  error?: string;
  raw?: unknown;
}

export interface AIConnector {
  id: AIProviderId;
  displayName: string;
  isConfigured(): boolean;
  complete(request: AIRequest): Promise<AIProviderResponse>;
}

export const PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  mistral: "Mistral",
  meta: "Meta Llama",
  qwen: "Qwen",
  cohere: "Cohere",
  moonshot: "Kimi / Moonshot AI",
  minimax: "MiniMax",
  zai: "Z.ai / GLM",
  microsoft: "Microsoft Phi",
  amazon: "Amazon Nova",
  nvidia: "NVIDIA Nemotron",
  ai21: "AI21",
  nous: "Nous Research",
  writer: "Writer",
  stepfun: "StepFun",
  inception: "Inception",
  liquid: "Liquid AI",
  arcee: "Arcee AI",
  zeroone: "01.AI",
  tencent: "Tencent Hunyuan",
};
