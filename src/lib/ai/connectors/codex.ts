import type { AIConnector, AIProviderResponse, AIRequest } from "../types";

const DEFAULT_CODEX_MODEL = "gpt-5.3-codex";
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
const CODEX_TIMEOUT_MS = 60000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Codex timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractResponsesText(data: unknown) {
  const response = data && typeof data === "object" ? data as Record<string, unknown> : {};
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const output = Array.isArray(response.output) ? response.output : [];
  const parts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const value = part as Record<string, unknown>;
      if (value.type === "output_text" && typeof value.text === "string") {
        parts.push(value.text);
      }
    }
  }

  return parts.join("\n").trim();
}

export class CodexConnector implements AIConnector {
  id = "codex" as const;
  displayName = "Codex";

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const model = request.model?.trim() || DEFAULT_CODEX_MODEL;
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return {
        provider: this.id,
        model,
        content: "",
        latencyMs: Date.now() - started,
        error: "OPENAI_API_KEY is not configured for Codex.",
      };
    }

    try {
      const body: Record<string, unknown> = {
        model,
        input: request.messages,
        max_output_tokens: request.maxTokens || DEFAULT_MAX_OUTPUT_TOKENS,
      };

      const res = await withTimeout(
        fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
        CODEX_TIMEOUT_MS,
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `OpenAI Codex HTTP ${res.status}`);

      const content = extractResponsesText(data);
      const incompleteReason = data?.incomplete_details?.reason;
      const tokenLimited = incompleteReason === "max_output_tokens";

      if (!content) throw new Error("Codex returned an empty response");

      return {
        provider: this.id,
        model: data?.model || model,
        content,
        latencyMs: Date.now() - started,
        raw: tokenLimited ? { ...data, rcTruncated: true } : data,
      };
    } catch (error) {
      return {
        provider: this.id,
        model,
        content: "",
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : "Unknown Codex error",
      };
    }
  }
}
