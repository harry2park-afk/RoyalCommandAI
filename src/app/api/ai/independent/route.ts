import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import { AI_PROVIDER_IDS, PROVIDER_LABELS, type AIMessage, type AIProviderId } from "@/lib/ai/types";

export const maxDuration = 120;

const MAX_HISTORY = 24;
const MAX_PROMPT_CHARS = 40_000;

function isProviderId(value: unknown): value is AIProviderId {
  return typeof value === "string" && AI_PROVIDER_IDS.includes(value as AIProviderId);
}

function sanitizeHistory(value: unknown): AIMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_HISTORY)
    .filter((item): item is { role: "user" | "assistant"; content: string } => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      return (row.role === "user" || row.role === "assistant") && typeof row.content === "string";
    })
    .map((item) => ({ role: item.role, content: item.content.slice(0, MAX_PROMPT_CHARS) }));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const provider = body?.provider;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const language = typeof body?.language === "string" ? body.language : user.defaultLanguage || "en";
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";

  if (!requestId) return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  if (!isProviderId(provider)) return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  if (prompt.length > MAX_PROMPT_CHARS) return NextResponse.json({ error: "Prompt is too long" }, { status: 413 });

  const selectedProviders = Array.isArray(body?.selectedProviders)
    ? body.selectedProviders.filter(isProviderId)
    : [provider];

  // Selected Provider Set is the authoritative runtime contract.
  // No fallback, relay, reviewer, hidden fan-out, or implicit provider invocation is allowed here.
  if (!selectedProviders.includes(provider)) {
    return NextResponse.json({ error: "Provider is not in the authoritative selected provider set" }, { status: 403 });
  }

  const available = new Set(getAvailableProviderIds());
  if (!available.has(provider)) {
    return NextResponse.json({ error: `${PROVIDER_LABELS[provider]} is not connected` }, { status: 503 });
  }

  const connector = getConnector(provider);
  const history = sanitizeHistory(body?.history);
  const messages: AIMessage[] = [
    {
      role: "system",
      content: [
        `You are ${PROVIDER_LABELS[provider]} inside a strictly isolated Royal Command provider room.`,
        "You may use only the conversation history included in this request.",
        "You cannot see, infer, request, or reference another provider room's prompts, answers, history, memory, selection state, or context.",
        "Do not claim another AI said or saw anything unless the user explicitly pasted that content into this room.",
        `Reply in ${language === "ko" ? "Korean" : language === "en" ? "English" : language} unless the user requests another language.`,
      ].join("\n"),
    },
    ...history,
    { role: "user", content: prompt },
  ];

  try {
    const startedAt = Date.now();
    const result = await connector.complete({ messages });
    const finishedAt = Date.now();

    return NextResponse.json({
      requestId,
      provider,
      providerName: PROVIDER_LABELS[provider],
      model: result.model,
      content: result.content,
      latencyMs: result.latencyMs || finishedAt - startedAt,
      error: result.error || null,
      receipt: {
        requestId,
        provider,
        terminal: true,
        completedAt: new Date(finishedAt).toISOString(),
      },
    }, { status: result.error ? 502 : 200 });
  } catch (error) {
    return NextResponse.json({
      requestId,
      provider,
      error: error instanceof Error ? error.message : "Provider request failed",
      receipt: {
        requestId,
        provider,
        terminal: true,
        completedAt: new Date().toISOString(),
      },
    }, { status: 502 });
  }
}
