import type { AIConnector, AIProviderResponse, AIRequest } from "../types";
import { logger } from "@/lib/logger";
import { extractProviderText } from "./openrouter";

const OPENAI_PRIMARY_TIMEOUT_MS = 20_000;
const OPENAI_GPT56_TIMEOUT_MS = 24_000;
const OPENAI_GPT56_RETRY_TIMEOUT_MS = 14_000;
const OPENAI_RETRY_TIMEOUT_MS = 10_000;
const OPENROUTER_FALLBACK_TIMEOUT_MS = 14_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 3_072;
const OPENROUTER_FALLBACK_MAX_TOKENS = 2_048;
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_OPENAI_RETRY_MODEL = "gpt-4o-mini";

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function outputTokenLimit(request: AIRequest) {
  return Math.min(request.maxTokens || DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS);
}

function usefulPartial(content: string) {
  return content.trim().length > 200;
}

function transientOpenAIError(message: string) {
  return /(empty response|timed out|timeout|rate limit|too many requests|temporar|overload|\b429\b|\b500\b|\b502\b|\b503\b|\b504\b)/i.test(message);
}

async function callOpenAI(request: AIRequest, model: string, timeoutMs: number) {
  const requestBody: Record<string, unknown> = {
    model,
    messages: request.messages,
    max_completion_tokens: outputTokenLimit(request),
  };
  if (request.temperature !== undefined) requestBody.temperature = request.temperature;

  const res = await withTimeout(
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }),
    timeoutMs,
    `OpenAI ${model}`,
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);

  const choice = data?.choices?.[0];
  const content = extractProviderText(choice?.message?.content).trim();
  return {
    model: data?.model || model,
    content,
    raw: data,
    tokenLimited: choice?.finish_reason === "length",
  };
}

async function callOpenRouterFallback(request: AIRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

  const model = process.env.OPENROUTER_OPENAI_MODEL || "openai/gpt-4.1-mini";
  const maxTokens = Math.min(outputTokenLimit(request), OPENROUTER_FALLBACK_MAX_TOKENS);
  const requestBody: Record<string, unknown> = { model, messages: request.messages, max_tokens: maxTokens };
  if (request.temperature !== undefined) requestBody.temperature = request.temperature;

  const res = await withTimeout(
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://royalcommand.ai",
        "X-Title": "RoyalCommand.ai",
      },
      body: JSON.stringify(requestBody),
    }),
    OPENROUTER_FALLBACK_TIMEOUT_MS,
    "OpenRouter OpenAI fallback",
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenRouter HTTP ${res.status}`);

  const choice = data?.choices?.[0];
  const content = extractProviderText(choice?.message?.content).trim();
  return {
    model: data?.model || model,
    content,
    raw: data,
    tokenLimited: choice?.finish_reason === "length" || choice?.native_finish_reason === "max_tokens",
  };
}

export class OpenAIConnector implements AIConnector {
  id = "openai" as const;
  displayName = "ChatGPT";

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY);
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const explicitModel = request.model?.trim();
    const primaryModel = explicitModel || (process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim();
    const retryModel = (process.env.OPENAI_RETRY_MODEL || DEFAULT_OPENAI_RETRY_MODEL).trim();
    const errors: string[] = [];

    if (process.env.OPENAI_API_KEY) {
      const explicitAttempts = primaryModel.startsWith("gpt-5.6-")
        ? [
            { model: primaryModel, timeoutMs: OPENAI_GPT56_TIMEOUT_MS },
            { model: primaryModel, timeoutMs: OPENAI_GPT56_RETRY_TIMEOUT_MS },
          ]
        : [
            { model: primaryModel, timeoutMs: OPENAI_PRIMARY_TIMEOUT_MS },
            { model: primaryModel, timeoutMs: OPENAI_RETRY_TIMEOUT_MS },
          ];
      const attempts = explicitModel
        ? explicitAttempts
        : [
            { model: primaryModel, timeoutMs: OPENAI_PRIMARY_TIMEOUT_MS },
            { model: retryModel, timeoutMs: OPENAI_RETRY_TIMEOUT_MS },
          ].filter((attempt, index, all) => index === 0 || attempt.model !== all[0]?.model);

      for (let index = 0; index < attempts.length; index += 1) {
        const attempt = attempts[index]!;
        logger.info("ai.provider.primary_route", {
          provider: this.displayName,
          via: "OpenAI direct",
          model: attempt.model,
          explicitModel: Boolean(explicitModel),
          attempt: index + 1,
          maxTokens: outputTokenLimit(request),
          timeoutMs: attempt.timeoutMs,
        });
        try {
          const result = await callOpenAI(request, attempt.model, attempt.timeoutMs);
          if (!result.content) throw new Error("OpenAI returned an empty response");
          if (result.tokenLimited && !usefulPartial(result.content)) {
            throw new Error("OpenAI response ended at its output-token limit before completion");
          }
          if (result.tokenLimited) {
            logger.warn("ai.provider.partial_accepted", {
              provider: this.displayName,
              model: result.model,
              reason: "output-token-limit",
              contentChars: result.content.length,
            });
          }
          return {
            provider: this.id,
            model: result.model,
            content: result.content,
            latencyMs: Date.now() - started,
            raw: result.tokenLimited ? { ...result.raw, rcTruncated: true } : result.raw,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown OpenAI error";
          errors.push(message);
          logger.warn("ai.provider.failed", {
            provider: this.displayName,
            via: "OpenAI direct",
            model: attempt.model,
            explicitModel: Boolean(explicitModel),
            attempt: index + 1,
            error: message.slice(0, 500),
          });
          if (explicitModel && index === 0 && transientOpenAIError(message)) continue;
          if (explicitModel) break;
        }
      }
    } else {
      errors.push("OPENAI_API_KEY is not configured");
    }

    // Explicit model selections are never silently substituted with another model.
    if (!explicitModel && process.env.OPENROUTER_API_KEY) {
      logger.warn("ai.provider.fallback", {
        provider: this.displayName,
        from: "OpenAI direct",
        to: "OpenRouter",
        reason: errors.join("; ").slice(0, 500),
        maxTokens: Math.min(outputTokenLimit(request), OPENROUTER_FALLBACK_MAX_TOKENS),
      });
      try {
        const result = await callOpenRouterFallback(request);
        if (!result.content) throw new Error("OpenRouter OpenAI fallback returned an empty response");
        if (result.tokenLimited && !usefulPartial(result.content)) {
          throw new Error("OpenRouter OpenAI fallback ended at its output-token limit before completion");
        }
        return {
          provider: this.id,
          model: result.model,
          content: result.content,
          latencyMs: Date.now() - started,
          raw: { fallback: "openrouter", result: result.raw, previousErrors: errors, rcTruncated: result.tokenLimited },
        };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Unknown OpenRouter fallback error");
      }
    }

    return {
      provider: this.id,
      model: primaryModel,
      content: "",
      latencyMs: Date.now() - started,
      error: errors.join("; ") || "OpenAI request failed",
    };
  }
}
