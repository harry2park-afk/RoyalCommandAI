import type { AIConnector, AIProviderResponse, AIRequest } from "../types";
import { extractProviderText } from "./openrouter";

/**
 * Direct Perplexity Sonar connector.
 *
 * This connector is intentionally dormant until PERPLEXITY_API_KEY is set.
 * No request is made and no Perplexity cost can be incurred without that key.
 */
export class PerplexityConnector implements AIConnector {
  id = "perplexity" as const;
  displayName = "Perplexity";

  isConfigured() {
    return Boolean(process.env.PERPLEXITY_API_KEY?.trim());
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const model = request.model?.trim() || process.env.PERPLEXITY_MODEL?.trim() || "sonar-pro";
    const apiKey = process.env.PERPLEXITY_API_KEY?.trim();

    if (!apiKey) {
      return {
        provider: this.id,
        model,
        content: "",
        latencyMs: Date.now() - started,
        error: "Perplexity is prepared but not activated. Set PERPLEXITY_API_KEY to enable it.",
      };
    }

    try {
      const requestBody: Record<string, unknown> = {
        model,
        messages: request.messages,
      };
      if (request.temperature !== undefined) requestBody.temperature = request.temperature;
      if (request.maxTokens) requestBody.max_tokens = request.maxTokens;

      const res = await fetch("https://api.perplexity.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error?.message || data?.message || `Perplexity HTTP ${res.status}`;
        throw new Error(message);
      }

      const choice = data?.choices?.[0];
      const content = extractProviderText(choice?.message?.content).trim();
      const tokenLimited = choice?.finish_reason === "length";

      return {
        provider: this.id,
        model: data?.model || model,
        content,
        latencyMs: Date.now() - started,
        raw: {
          response: data,
          citations: Array.isArray(data?.citations) ? data.citations : [],
          searchResults: Array.isArray(data?.search_results) ? data.search_results : [],
        },
        error: tokenLimited ? "Perplexity response ended at its output-token limit before completion" : undefined,
      };
    } catch (error) {
      return {
        provider: this.id,
        model,
        content: "",
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : "Unknown Perplexity error",
      };
    }
  }
}
