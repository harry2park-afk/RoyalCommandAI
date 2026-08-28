import type { AIConnector, AIProviderResponse, AIRequest } from "../types";
import { extractProviderText } from "./openrouter";

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
        messages: request.messages,
        max_completion_tokens: request.maxTokens || DEFAULT_MAX_OUTPUT_TOKENS,
      };

      const res = await withTimeout(
        fetch("https://api.openai.com/v1/chat/completions", {
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

      const choice = data?.choices?.[0];
      const content = extractProviderText(choice?.message?.content).trim();
      const tokenLimited = choice?.finish_reason === "length";

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
