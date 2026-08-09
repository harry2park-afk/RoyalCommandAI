import type { AIConnector, AIProviderId, AIProviderResponse, AIRequest } from "../types";

const OPENROUTER_API = "https://openrouter.ai/api/v1";
const modelCache = new Map<string, string>();

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

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
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

    const model = await this.resolveModel();
    const res = await fetch(`${OPENROUTER_API}/chat/completions`, {
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
        temperature: request.temperature ?? 0.35,
        max_tokens: request.maxTokens ?? 1200,
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error?.message || `OpenRouter request failed (${res.status})`);
    }

    const content = body?.choices?.[0]?.message?.content;
    return {
      provider: this.id,
      model: body?.model || model,
      content: typeof content === "string" ? content : JSON.stringify(content ?? ""),
      latencyMs: Date.now() - started,
      raw: body,
    };
  }
}
