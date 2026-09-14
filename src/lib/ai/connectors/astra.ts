import type { AIConnector, AIProviderResponse, AIRequest } from "../types";

const ASTRA_MODEL = "gpt-6-astra";
const ASTRA_TIMEOUT_MS = 90_000;

function extractText(data: unknown) {
  const response = data && typeof data === "object" ? data as Record<string, unknown> : {};
  if (typeof response.output_text === "string") return response.output_text.trim();
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
      if (value.type === "output_text" && typeof value.text === "string") parts.push(value.text);
    }
  }
  return parts.join("\n").trim();
}

export class AstraConnector implements AIConnector {
  id = "astra" as const;
  displayName = "Astra Light";

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return { provider: this.id, model: ASTRA_MODEL, content: "", latencyMs: 0, error: "OPENAI_API_KEY is not configured for Astra Light." };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ASTRA_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: ASTRA_MODEL,
          input: request.messages,
          max_output_tokens: request.maxTokens || 4096,
          reasoning: { effort: "low" },
          text: { verbosity: "low" },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || `OpenAI Astra HTTP ${response.status}`);
      const content = extractText(data);
      if (!content) throw new Error("Astra Light returned an empty response");
      return { provider: this.id, model: String(data?.model || ASTRA_MODEL), content, latencyMs: Date.now() - started, raw: data };
    } catch (error) {
      return { provider: this.id, model: ASTRA_MODEL, content: "", latencyMs: Date.now() - started, error: error instanceof Error ? error.message : "Astra Light request failed" };
    } finally {
      clearTimeout(timer);
    }
  }
}
