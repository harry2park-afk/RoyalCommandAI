import type { AIConnector, AIProviderResponse, AIRequest } from "../types";
import { logger } from "@/lib/logger";
import { OpenRouterCatalogConnector } from "./openrouter";

const RETIRED_GEMINI_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
]);

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_DIRECT_FALLBACK_MODEL = "gemini-3.5-flash-lite";
const GEMINI_DEFAULT_OUTPUT_TOKENS = 2048;
const GEMINI_MAX_OUTPUT_TOKENS = 16384;
const GEMINI_OPENROUTER_MAX_TOKENS = 16384;
const GEMINI_DIRECT_TIMEOUT_MS = 22_000;
const GEMINI_HIGH_DEMAND_RETRY_DELAY_MS = 1_200;

const openRouterGemini = new OpenRouterCatalogConnector(
  "google",
  "Gemini",
  "google gemini flash",
);

function getGeminiApiKeys() {
  return Array.from(new Set([
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_AI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ].map((value) => (value || "").trim()).filter(Boolean)));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Gemini timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function isHighDemandError(message: string) {
  return /(high demand|resource exhausted|too many requests|\b429\b)/i.test(message);
}

async function wait(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class GoogleConnector implements AIConnector {
  id = "google" as const;
  displayName = "Gemini";

  isConfigured() {
    return Boolean(getGeminiApiKeys().length || process.env.OPENROUTER_API_KEY);
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const explicitModel = request.model?.trim();
    const configuredModel = (process.env.GOOGLE_AI_MODEL || "").trim();
    const primaryModel = explicitModel || (!configuredModel || RETIRED_GEMINI_MODELS.has(configuredModel)
      ? DEFAULT_GEMINI_MODEL
      : configuredModel);
    const directModels = explicitModel
      ? [primaryModel]
      : Array.from(new Set([primaryModel, GEMINI_DIRECT_FALLBACK_MODEL]));
    const boundedRequest: AIRequest = {
      ...request,
      maxTokens: Math.min(request.maxTokens || GEMINI_DEFAULT_OUTPUT_TOKENS, GEMINI_MAX_OUTPUT_TOKENS),
    };

    const direct = async (apiKey: string, targetModel: string): Promise<AIProviderResponse> => {
      try {
        const system = boundedRequest.messages
          .filter((m) => m.role === "system")
          .map((m) => m.content)
          .join("\n");
        const contents = boundedRequest.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        const generationConfig: Record<string, unknown> = {
          maxOutputTokens: boundedRequest.maxTokens,
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;
        const res = await fetchWithTimeout(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
            contents,
            generationConfig,
          }),
        }, GEMINI_DIRECT_TIMEOUT_MS);

        const data = await res.json();
        if (!res.ok) {
          const message = data?.error?.message || `Google AI HTTP ${res.status}`;
          logger.warn("ai.provider.failed", {
            provider: this.displayName,
            model: targetModel,
            explicitModel: Boolean(explicitModel),
            status: res.status,
            error: String(message).slice(0, 500),
          });
          return {
            provider: this.id,
            model: targetModel,
            content: "",
            latencyMs: Date.now() - started,
            error: String(message),
          };
        }

        const candidate = data.candidates?.[0];
        const content = candidate?.content?.parts
          ?.map((p: { text?: string }) => p.text || "")
          .join("")
          .trim() || "";
        const finishReason = candidate?.finishReason;
        const tokenLimited = finishReason === "MAX_TOKENS";

        if (tokenLimited && content.length > 200) {
          logger.warn("ai.provider.partial_accepted", {
            provider: this.displayName,
            model: targetModel,
            reason: "output-token-limit",
            contentChars: content.length,
          });
        }

        return {
          provider: this.id,
          model: targetModel,
          content,
          latencyMs: Date.now() - started,
          raw: tokenLimited ? { ...data, rcTruncated: true } : data,
          error: tokenLimited && content.length <= 200 ? "Gemini response ended at its output-token limit before completion" : undefined,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Google error";
        logger.warn("ai.provider.exception", {
          provider: this.displayName,
          model: targetModel,
          explicitModel: Boolean(explicitModel),
          error: message.slice(0, 500),
        });
        return {
          provider: this.id,
          model: targetModel,
          content: "",
          latencyMs: Date.now() - started,
          error: message,
        };
      }
    };

    const directErrors: string[] = [];
    const apiKeys = getGeminiApiKeys();

    for (const targetModel of directModels) {
      for (let index = 0; index < apiKeys.length; index += 1) {
        logger.info("ai.provider.primary_route", {
          provider: this.displayName,
          via: targetModel === primaryModel ? "Google direct" : "Google direct fallback",
          model: targetModel,
          explicitModel: Boolean(explicitModel),
          keySlot: index + 1,
        });
        let result = await direct(apiKeys[index]!, targetModel);

        if (explicitModel && isHighDemandError(result.error || "")) {
          logger.warn("ai.provider.high_demand_retry", {
            provider: this.displayName,
            model: targetModel,
            delayMs: GEMINI_HIGH_DEMAND_RETRY_DELAY_MS,
          });
          await wait(GEMINI_HIGH_DEMAND_RETRY_DELAY_MS);
          result = await direct(apiKeys[index]!, targetModel);
        }

        if (!result.error && result.content?.trim()) return result;
        directErrors.push(`${targetModel}: ${result.error || "empty response"}`);
        if (/timed out/i.test(result.error || "")) break;
      }
    }

    // Explicit Phase 4 model selection must not fall back to a different model.
    if (!explicitModel && process.env.OPENROUTER_API_KEY) {
      const routedRequest: AIRequest = {
        ...boundedRequest,
        model: undefined,
        maxTokens: Math.min(boundedRequest.maxTokens || GEMINI_DEFAULT_OUTPUT_TOKENS, GEMINI_OPENROUTER_MAX_TOKENS),
      };
      logger.warn("ai.provider.fallback", {
        provider: this.displayName,
        from: apiKeys.length ? "Google direct routes" : "No Google API key",
        to: "OpenRouter",
        reason: directErrors.join("; ").slice(0, 500) || "direct key unavailable",
        maxTokens: routedRequest.maxTokens,
      });
      try {
        const routed = await openRouterGemini.complete(routedRequest);
        if (!routed.error && routed.content?.trim()) return routed;
        return {
          ...routed,
          error: [directErrors.join("; "), routed.error || "OpenRouter Gemini returned an empty response"].filter(Boolean).join("; "),
        };
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "OpenRouter Gemini fallback failed";
        return {
          provider: this.id,
          model: primaryModel,
          content: "",
          latencyMs: Date.now() - started,
          error: [directErrors.join("; "), fallbackMessage].filter(Boolean).join("; "),
        };
      }
    }

    return {
      provider: this.id,
      model: primaryModel,
      content: "",
      latencyMs: Date.now() - started,
      error: directErrors.join("; ") || "GEMINI_API_KEY (or GOOGLE_AI_API_KEY / GOOGLE_API_KEY) is not configured",
    };
  }
}
