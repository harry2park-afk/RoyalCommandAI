import type { AIConnector, AIProviderResponse, AIRequest } from "../types";
import { extractProviderText } from "./openrouter";

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
      const requestBody: Record<string, unknown> = {
        model,
        messages: request.messages,
      };
      if (request.temperature !== undefined) requestBody.temperature = request.temperature;
      if (request.maxTokens) requestBody.max_tokens = request.maxTokens;

      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `xAI HTTP ${res.status}`);
      }

      const choice = data?.choices?.[0];
      const content = extractProviderText(choice?.message?.content).trim();
      const tokenLimited = choice?.finish_reason === "length";

      return {
        provider: this.id,
        model: data?.model || model,
        content,
        latencyMs: Date.now() - started,
        raw: data,
        error: tokenLimited ? "Grok response ended at its output-token limit before completion" : undefined,
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
