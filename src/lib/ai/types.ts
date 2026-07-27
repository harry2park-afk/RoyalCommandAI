export type AIProviderId = "openai" | "anthropic" | "google" | "xai";

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
};
