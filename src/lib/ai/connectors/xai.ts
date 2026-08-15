import type { AIConnector, AIProviderResponse, AIRequest } from "../types";

export class XAIConnector implements AIConnector {
  id = "xai" as const;
  displayName = "Grok";

  isConfigured() {
    return Boolean(process.env.XAI_API_KEY);
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const model = process.env.XAI_MODEL || "grok-4.5";
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.4,
          max_tokens: request.maxTokens ?? 1200,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `xAI HTTP ${res.status}`);
      }

      return {
        provider: this.id,
        model,
        content: data.choices?.[0]?.message?.content?.trim() || "",
        latencyMs: Date.now() - started,
        raw: data,
      };
    } catch (error) {
      return {
        provider: this.id,
        model,
        content: "",
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : "Unknown xAI error",
      };
    }
  }
}