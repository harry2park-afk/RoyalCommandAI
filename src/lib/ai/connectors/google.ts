import type { AIConnector, AIProviderResponse, AIRequest } from "../types";

export class GoogleConnector implements AIConnector {
  id = "google" as const;
  displayName = "Gemini";

  isConfigured() {
    return Boolean(process.env.GOOGLE_AI_API_KEY);
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    const model = process.env.GOOGLE_AI_MODEL || "gemini-3.5-flash";
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
          systemInstruction: system
            ? { parts: [{ text: system }] }
            : undefined,
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.4,
            maxOutputTokens: request.maxTokens ?? 1200,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Google AI HTTP ${res.status}`);
      }

      const content =
        data.candidates?.[0]?.content?.parts
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
      return {
        provider: this.id,
        model,
        content: "",
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : "Unknown Google error",
      };
    }
  }
}