import { z } from "zod";
import { access, reply, failure, input } from "@/lib/rcv3/access";
import { reserve, history, scopeSchema, type Turn } from "@/lib/rcv3/execution";
import { AI_PROVIDER_IDS } from "@/lib/ai/types";
import { getConnector, isProviderConfigured } from "@/lib/ai/connectors";
export const maxDuration = 120;
export async function GET(request: Request) {
  try {
    const url = new URL(request.url), a = await access(url.searchParams.get("room") ?? "");
    return reply({ turns: await history(a, scopeSchema.parse(url.searchParams.get("scope") ?? "chat")) });
  } catch(e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const start = performance.now();
    const d = z.object({ roomId: z.string().uuid(), requestId: z.string().uuid(), scope: scopeSchema, provider: z.enum(AI_PROVIDER_IDS), prompt: z.string().trim().min(1).max(12000) }).strict().parse(await input(request, 20000));
    const a = await access(d.roomId), turns = await history(a, d.scope);
    const previous = turns.find(t => t.requestId === d.requestId);
    if (previous) return reply(previous);
    if (!isProviderConfigured(d.provider)) throw new Error("RCV3_AI_NOT_CONNECTED");
    await reserve(a, d.requestId, "chat");
    const result = await getConnector(d.provider).complete({ messages: [
      { role: "system", content: `You are ${d.scope === "secretary" ? "Katie, this customer's personal secretary" : "the customer's AI assistant"}. Answer the actual question directly in the user's language. Use supplied conversation only. Do not turn questions into task acknowledgements. You have no external action tools: never claim to send, book, pay or change external systems. Account language fallback: ${a.user.defaultLanguage}.` },
      ...turns.filter(t => t.provider === d.provider).slice(-10).flatMap(t => [{ role: "user" as const, content: t.prompt }, { role: "assistant" as const, content: t.answer }]),
      { role: "user", content: d.prompt },
    ], maxTokens: 1500 });
    if (result.error || !result.content.trim()) throw new Error("RCV3_AI_RESPONSE");
    const turn: Turn = { requestId: d.requestId, scope: d.scope, provider: d.provider, prompt: d.prompt, answer: result.content.slice(0,50000), at: new Date().toISOString(), durationMs: performance.now() - start };
    await a.store.insert(`turns/${d.scope}/${Date.now()}-${d.requestId}.txt`, turn);
    return reply(turn, 200, performance.now()-start);
  } catch(e) { return failure(e); }
}
