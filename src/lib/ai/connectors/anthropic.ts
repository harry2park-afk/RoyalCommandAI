import type { AIConnector, AIProviderResponse, AIRequest } from "../types";
import { logger } from "@/lib/logger";

const RETIRED_CLAUDE_MODELS = new Set([
  "claude-3-5-haiku-latest",
  "claude-3-5-haiku-20241022",
  "claude-3-haiku-20240307",
]);

export class AnthropicConnector implements AIConnector {
  id = "anthropic" as const;
  displayName = "Claude";

  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const configuredModel = (process.env.ANTHROPIC_MODEL || "").trim();
    const model = !configuredModel || RETIRED_CLAUDE_MODELS.has(configuredModel)
      ? "claude-haiku-4-5"
      : configuredModel;
    try {
      const system = request.messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n");
      const messages = request.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: request.maxTokens ?? 1200,
          temperature: request.temperature ?? 0.4,
          system: system || undefined,
          messages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data?.error?.message || `Anthropic HTTP ${res.status}`;
        logger.warn("ai.provider.failed", {
          provider: this.displayName,
          model,
          status: res.status,
          error: String(message).slice(0, 500),
        });
        throw new Error(message);
      }

      const content =
        Array.isArray(data.content)
          ? data.content
              .filter((c: { type: string }) => c.type === "text")
              .map((c: { text: string }) => c.text)
              .join("\n")
              .trim()
          : "";

      return {
        provider: this.id,
        model,
        content,
        latencyMs: Date.now() - started,
        raw: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Anthropic error";
      logger.warn("ai.provider.exception", {
        provider: this.displayName,
        model,
        error: message.slice(0, 500),
      });
      return {
        provider: this.id,
        model,
        content: "",
        latencyMs: Date.now() - started,
        error: message,
      };
    }
  }
}