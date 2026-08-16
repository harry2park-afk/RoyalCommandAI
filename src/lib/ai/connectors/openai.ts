import type { AIConnector, AIProviderResponse, AIRequest } from "../types";

const OPENAI_PRIMARY_TIMEOUT_MS = 75_000;
const OPENAI_RETRY_TIMEOUT_MS = 45_000;
const OPENROUTER_FALLBACK_TIMEOUT_MS = 60_000;

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function callOpenAI(request: AIRequest, model: string, timeoutMs: number) {
  const res = await withTimeout(
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxTokens ?? 1200,
      }),
    }),
    timeoutMs,
    "OpenAI",
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);
  }

  return {
    model: data?.model || model,
    content: data.choices?.[0]?.message?.content?.trim() || "",
    raw: data,
  };
}

async function callOpenRouterFallback(request: AIRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

  const model = process.env.OPENROUTER_OPENAI_MODEL || "openai/gpt-4o-mini";
  const res = await withTimeout(
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://royalcommand.ai",
        "X-Title": "RoyalCommand.ai",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxTokens ?? 1200,
      }),
    }),
    OPENROUTER_FALLBACK_TIMEOUT_MS,
    "OpenRouter OpenAI fallback",
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenRouter HTTP ${res.status}`);
  }

  return {
    model: data?.model || model,
    content: data?.choices?.[0]?.message?.content?.trim() || "",
    raw: data,
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
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const errors: string[] = [];

    if (process.env.OPENAI_API_KEY) {
      for (const timeoutMs of [OPENAI_PRIMARY_TIMEOUT_MS, OPENAI_RETRY_TIMEOUT_MS]) {
        try {
          const result = await callOpenAI(request, model, timeoutMs);
          if (!result.content) throw new Error("OpenAI returned an empty response");
          return {
            provider: this.id,
            model: result.model,
            content: result.content,
            latencyMs: Date.now() - started,
            raw: result.raw,
          };
        } catch (error) {
          errors.push(error instanceof Error ? error.message : "Unknown OpenAI error");
        }
      }
    } else {
      errors.push("OPENAI_API_KEY is not configured");
    }

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const result = await callOpenRouterFallback(request);
        if (!result.content) throw new Error("OpenRouter OpenAI fallback returned an empty response");
        return {
          provider: this.id,
          model: result.model,
          content: result.content,
          latencyMs: Date.now() - started,
          raw: { fallback: "openrouter", result: result.raw, previousErrors: errors },
        };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Unknown OpenRouter fallback error");
      }
    }

    return {
      provider: this.id,
      model,
      content: "",
      latencyMs: Date.now() - started,
      error: errors.join("; ") || "OpenAI request failed",
    };
  }
}
