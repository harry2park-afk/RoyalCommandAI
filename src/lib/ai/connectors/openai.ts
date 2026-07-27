import type { AIConnector, AIProviderResponse, AIRequest } from "../types";

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

export class OpenAIConnector implements AIConnector {
  id = "openai" as const;
  displayName = "ChatGPT";

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    try {
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
        45000,
        "OpenAI",
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);
      }

      return {
        provider: this.id,
        model,
        content: data.choices?.[0]?.message?.content?.trim() || "",
        latencyMs: Date.now() - started,
        raw: data,
      };
    } catch (error) {
      return {
        provider: this.id,
        model,
        content: "",
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : "Unknown OpenAI error",
      };
    }
  }
}
