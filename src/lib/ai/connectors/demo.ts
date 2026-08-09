import type { AIConnector, AIProviderId, AIProviderResponse, AIRequest } from "../types";

const DEMO_STYLES: Partial<Record<AIProviderId, string>> = {
  openai: "structured and practical",
  anthropic: "careful and nuanced",
  google: "concise and factual",
  xai: "direct and witty",
};

export class DemoConnector implements AIConnector {
  constructor(
    public id: AIProviderId,
    public displayName: string,
  ) {}

  isConfigured() {
    return true;
  }

  async complete(request: AIRequest): Promise<AIProviderResponse> {
    const started = Date.now();
    await new Promise((r) => setTimeout(r, 180 + Math.random() * 420));
    const lastUser = [...request.messages].reverse().find((m) => m.role === "user");
    const prompt = lastUser?.content || "";
    const style = DEMO_STYLES[this.id] || "clear, useful and professional";

    return {
      provider: this.id,
      model: `demo-${this.id}`,
      content: `[${this.displayName} · demo]\nA ${style} response to: "${prompt.slice(0, 180)}"\n\nKey points:\n1. Clarify the goal inside your Royal Command Room.\n2. Use connected AI services through secure connectors.\n3. Keep originals preserved and approve important outputs before sending.`,
      latencyMs: Date.now() - started,
    };
  }
}
