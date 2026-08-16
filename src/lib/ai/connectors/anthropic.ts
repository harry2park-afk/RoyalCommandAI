import type { AIConnector, AIProviderResponse, AIRequest } from "../types";
import { logger } from "@/lib/logger";
import { OpenRouterCatalogConnector } from "./openrouter";

const RETIRED_CLAUDE_MODELS = new Set([
  "claude-3-5-haiku-latest",
  "claude-3-5-haiku-20241022",
  "claude-3-haiku-20240307",
]);

// OpenRouter may price-check Claude against the model's full default output ceiling
// when no maximum is supplied. That caused otherwise valid requests to be rejected
// before generation. Keep a generous transport ceiling while avoiding that failure.
const CLAUDE_OPENROUTER_MAX_TOKENS = 16_000;

const openRouterClaude = new OpenRouterCatalogConnector(
  "anthropic",
  "Claude",
  "anthropic claude",
);

export class AnthropicConnector implements AIConnector {
  id = "anthropic" as const;
  displayName = "Claude";

  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY);
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const configuredModel = (process.env.ANTHROPIC_MODEL || "").trim();
    const model = !configuredModel || RETIRED_CLAUDE_MODELS.has(configuredModel)
      ? "claude-haiku-4-5"
      : configuredModel;

    const direct = async (): Promise<AIProviderResponse> => {
      if (!process.env.ANTHROPIC_API_KEY) {
        return {
          provider: this.id,
          model,
          content: "",
          latencyMs: Date.now() - started,
          error: "ANTHROPIC_API_KEY is not configured",
        };
      }

      try {
        const system = request.messages
          .filter((m) => m.role === "system")
          .map((m) => m.content)
          .join("\n");
        const messages = request.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content }));

        const requestBody: Record<string, unknown> = {
          model,
          max_tokens: request.maxTokens ?? 8192,
          system: system || undefined,
          messages,
        };
        if (request.temperature !== undefined) requestBody.temperature = request.temperature;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
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
          return {
            provider: this.id,
            model,
            content: "",
            latencyMs: Date.now() - started,
            error: String(message),
          };
        }

        const content = Array.isArray(data.content)
          ? data.content
              .filter((c: { type: string }) => c.type === "text")
              .map((c: { text: string }) => c.text)
              .join("\n")
              .trim()
          : "";
        const tokenLimited = data?.stop_reason === "max_tokens";

        return {
          provider: this.id,
          model,
          content,
          latencyMs: Date.now() - started,
          raw: data,
          error: tokenLimited ? "Claude response ended at its output-token limit before completion" : undefined,
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
    };

    const preferDirect = process.env.ROYAL_COMMAND_PREFER_DIRECT_AI === "true";
    const routedRequest: AIRequest = request.maxTokens
      ? request
      : { ...request, maxTokens: CLAUDE_OPENROUTER_MAX_TOKENS };

    if (process.env.OPENROUTER_API_KEY && !preferDirect) {
      logger.info("ai.provider.primary_route", {
        provider: this.displayName,
        via: "OpenRouter",
        maxTokens: routedRequest.maxTokens,
      });
      try {
        const routed = await openRouterClaude.complete(routedRequest);
        if (!routed.error && routed.content?.trim()) return routed;

        const error = String(routed.error || "OpenRouter Claude returned an empty response");
        logger.warn("ai.provider.primary_route.failed", {
          provider: this.displayName,
          via: "OpenRouter",
          error: error.slice(0, 500),
        });
        return { ...routed, error };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn("ai.provider.primary_route.failed", {
          provider: this.displayName,
          via: "OpenRouter",
          error: message.slice(0, 500),
        });

        // Do not hide the real OpenRouter failure behind a known-bad direct API key.
        // Direct Anthropic is only used when explicitly preferred by configuration.
        return {
          provider: this.id,
          model: "openrouter-claude",
          content: "",
          latencyMs: Date.now() - started,
          error: message,
        };
      }
    }

    const directResult = await direct();
    if (!directResult.error && directResult.content?.trim()) return directResult;

    if (process.env.OPENROUTER_API_KEY && preferDirect) {
      logger.warn("ai.provider.fallback", {
        provider: this.displayName,
        from: "Anthropic direct",
        to: "OpenRouter",
        reason: String(directResult.error || "empty response").slice(0, 500),
      });
      try {
        return await openRouterClaude.complete(routedRequest);
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "OpenRouter Claude fallback failed";
        return {
          ...directResult,
          error: `${directResult.error || "Anthropic direct failed"}; OpenRouter fallback failed: ${fallbackMessage}`,
        };
      }
    }

    return directResult;
  }
}
