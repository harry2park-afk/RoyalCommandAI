import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import { AI_PROVIDER_IDS, type AIProviderId, type AIMessage } from "@/lib/ai/types";
import { AU_V2_COOKIE, isAustraliaV2Host, verifyAuV2SessionToken } from "@/lib/auV2TestSession";

const MAX_PROMPT = 30000;
const MAX_PROVIDERS = 4;
const MAX_HISTORY_ITEMS = 16;
const MAX_HISTORY_CHARS = 12000;

function isProviderId(value: unknown): value is AIProviderId {
  return typeof value === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

function parseHistory(value: unknown): AIMessage[] {
  if (!Array.isArray(value)) return [];
  const parsed: AIMessage[] = [];
  let used = 0;

  for (const raw of value.slice(-MAX_HISTORY_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const role = item.role === "user" || item.role === "assistant" ? item.role : null;
    const content = typeof item.content === "string" ? item.content.trim() : "";
    if (!role || !content) continue;
    const remaining = MAX_HISTORY_CHARS - used;
    if (remaining <= 0) break;
    const clipped = content.slice(0, remaining);
    parsed.push({ role, content: clipped });
    used += clipped.length;
  }

  return parsed;
}

export async function POST(request: Request) {
  if (!isAustraliaV2Host(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const cookieStore = await cookies();
  if (!verifyAuV2SessionToken(cookieStore.get(AU_V2_COOKIE)?.value)) {
    return NextResponse.json({ error: "Australia V2 test session required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const history = parseHistory(body.history);
  const rawProviders: unknown[] = Array.isArray(body.providers) ? body.providers : [];
  const requested: AIProviderId[] = rawProviders.filter(isProviderId);
  if (!prompt || prompt.length > MAX_PROMPT) {
    return NextResponse.json({ error: `Prompt must be between 1 and ${MAX_PROMPT} characters.` }, { status: 400 });
  }

  const available = new Set<AIProviderId>(getAvailableProviderIds());
  const providers: AIProviderId[] = Array.from(new Set<AIProviderId>(requested))
    .filter((id) => available.has(id))
    .slice(0, MAX_PROVIDERS);
  if (!providers.length) return NextResponse.json({ error: "Select at least one connected AI." }, { status: 400 });

  const system = [
    "You are answering inside the isolated Royal Command Australia (RCA) Room.",
    "Use the supplied conversation history only as context for continuity.",
    "Answer the user's current question directly.",
    "Do not execute tools, browse, modify files, create branches, commit code, deploy, send messages, or take external actions.",
    "If the user asks for an external action, explain that this RCA test room is answer-only.",
  ].join(" ");

  const responses = await Promise.all(providers.map(async (provider) => {
    try {
      const result = await getConnector(provider).complete({
        messages: [
          { role: "system", content: system },
          ...history,
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        maxTokens: 1800,
      });
      return {
        provider,
        content: result.content || "",
        latencyMs: result.latencyMs,
        ...(result.error ? { error: result.error } : {}),
      };
    } catch (error) {
      return {
        provider,
        content: "",
        latencyMs: 0,
        error: error instanceof Error ? error.message : "AI request failed.",
      };
    }
  }));

  return NextResponse.json({ responses });
}
