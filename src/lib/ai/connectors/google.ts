import type { AIConnector, AIProviderResponse, AIRequest } from "../types";
import { logger } from "@/lib/logger";
import { OpenRouterCatalogConnector } from "./openrouter";

const RETIRED_GEMINI_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
]);

const openRouterGemini = new OpenRouterCatalogConnector(
  "google",
  "Gemini",
  "google gemini flash",
);

export class GoogleConnector implements AIConnector {
  id = "google" as const;
  displayName = "Gemini";

  isConfigured() {
    return Boolean(process.env.GOOGLE_AI_API_KEY || process.env.OPENROUTER_API_KEY);
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const configuredModel = (process.env.GOOGLE_AI_MODEL || "").trim();
    const model = !configuredModel || RETIRED_GEMINI_MODELS.has(configuredModel)
      ? "gemini-3.5-flash"
      : configuredModel;

    const direct = async (): Promise<AIProviderResponse> => {
      if (!process.env.GOOGLE_AI_API_KEY) {
        return {
          provider: this.id,
          model,
          content: "",
          latencyMs: Date.now() - started,
          error: "GOOGLE_AI_API_KEY is not configured",
        };
      }

      try {
        const system = request.messages
          .filter((m) => m.role === "system")
          .map((m) => m.content)
          .join("\n");
        const contents = request.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
            contents,
            generationConfig: {
              temperature: request.temperature ?? 0.4,
              maxOutputTokens: request.maxTokens ?? 1200,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          const message = data?.error?.message || `Google AI HTTP ${res.status}`;
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

        const content = data.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || "")
          .join("")
          .trim() || "";

        return {
          provider: this.id,
          model,
          content,
          latencyMs: Date.now() - started,
          raw: data,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Google error";
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

    if (process.env.OPENROUTER_API_KEY && !preferDirect) {
      logger.info("ai.provider.primary_route", {
        provider: this.displayName,
        via: "OpenRouter",
      });
      try {
        const routed = await openRouterGemini.complete(request);
        if (!routed.error && routed.content?.trim()) return routed;
        logger.warn("ai.provider.primary_route.failed", {
          provider: this.displayName,
          via: "OpenRouter",
          error: String(routed.error || "empty response").slice(0, 500),
        });
      } catch (error) {
        logger.warn("ai.provider.primary_route.failed", {
          provider: this.displayName,
          via: "OpenRouter",
          error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
        });
      }
    }

    const directResult = await direct();
    if (!directResult.error && directResult.content?.trim()) return directResult;

    if (process.env.OPENROUTER_API_KEY && preferDirect) {
      logger.warn("ai.provider.fallback", {
        provider: this.displayName,
        from: "Google direct",
        to: "OpenRouter",
        reason: String(directResult.error || "empty response").slice(0, 500),
      });
      try {
        return await openRouterGemini.complete(request);
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "OpenRouter Gemini fallback failed";
        return {
          ...directResult,
          error: `${directResult.error || "Google direct failed"}; OpenRouter fallback failed: ${fallbackMessage}`,
        };
      }
    }

    return directResult;
  }
}
