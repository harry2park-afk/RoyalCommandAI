import type { AIConnector, AIProviderId, AIProviderResponse, AIRequest } from "../types";
import { logger } from "@/lib/logger";

const OPENROUTER_API = "https://openrouter.ai/api/v1";
const OPENROUTER_TIMEOUT_MS = 18_000;
const modelCache = new Map<string, string>();

export function extractProviderText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractProviderText).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  for (const key of ["text", "output_text", "value"]) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  for (const key of ["content", "parts", "output"]) {
    const nested = extractProviderText(record[key]);
    if (nested) return nested;
  }
  return "";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`OpenRouter timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export class OpenRouterCatalogConnector implements AIConnector {
  constructor(
    public id: AIProviderId,
    public displayName: string,
    private modelQuery: string,
  ) {}

  isConfigured() {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  private async resolveModel(): Promise<string> {
    const cached = modelCache.get(this.id);
    if (cached) return cached;

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

    const url = new URL(`${OPENROUTER_API}/models`);
    url.searchParams.set("q", this.modelQuery);
    url.searchParams.set("sort", "most-popular");

    const res = await fetchWithTimeout(url.toString(), {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    }, 10_000);
    if (!res.ok) throw new Error(`OpenRouter model lookup failed (${res.status})`);

    const body = (await res.json()) as { data?: Array<{ id?: string }> };
    const model = body.data?.find((m) => m.id)?.id;
    if (!model) throw new Error(`No OpenRouter model found for ${this.displayName}`);

    modelCache.set(this.id, model);
    return model;
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

    const model = request.model?.trim() || await this.resolveModel();
    const requestBody: Record<string, unknown> = {
      model,
      messages: request.messages,
    };
    if (request.temperature !== undefined) requestBody.temperature = request.temperature;
    if (request.maxTokens) requestBody.max_completion_tokens = request.maxTokens;

    const res = await fetchWithTimeout(`${OPENROUTER_API}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://royalcommand.ai",
        "X-Title": "RoyalCommand.ai",
      },
      body: JSON.stringify(requestBody),
    }, OPENROUTER_TIMEOUT_MS);

    const body = await res.json();
    if (!res.ok) throw new Error(body?.error?.message || `OpenRouter request failed (${res.status})`);

    const choice = body?.choices?.[0];
    const rawContent = choice?.message?.content;
    const content = extractProviderText(rawContent).trim();
    const finishReason = choice?.finish_reason ?? null;
    const nativeFinishReason = choice?.native_finish_reason ?? null;
    const tokenLimited = finishReason === "length" || nativeFinishReason === "max_tokens" || nativeFinishReason === "max_output_tokens";

    logger.info("ai.openrouter.response_diagnostic", {
      provider: this.displayName,
      providerId: this.id,
      requestedModel: model,
      explicitModel: Boolean(request.model?.trim()),
      returnedModel: body?.model || model,
      status: res.status,
      choicesCount: Array.isArray(body?.choices) ? body.choices.length : 0,
      finishReason,
      nativeFinishReason,
      contentType: Array.isArray(rawContent) ? "array" : typeof rawContent,
      contentChars: content.length,
      promptTokens: body?.usage?.prompt_tokens ?? null,
      completionTokens: body?.usage?.completion_tokens ?? null,
      totalTokens: body?.usage?.total_tokens ?? null,
      maxTokensRequested: request.maxTokens ?? null,
      latencyMs: Date.now() - started,
    });

    if (tokenLimited && content.length > 200) {
      logger.warn("ai.provider.partial_accepted", {
        provider: this.displayName,
        model: body?.model || model,
        reason: "output-token-limit",
        contentChars: content.length,
      });
    }

    return {
      provider: this.id,
      model: body?.model || model,
      content,
      latencyMs: Date.now() - started,
      raw: tokenLimited ? { ...body, rcTruncated: true } : body,
      error: tokenLimited && content.length <= 200 ? "Provider response ended at its output-token limit before completion" : undefined,
    };
  }
}
