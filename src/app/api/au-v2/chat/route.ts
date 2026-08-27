import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import { AI_PROVIDER_IDS, type AIProviderId } from "@/lib/ai/types";
import { AU_V2_COOKIE, isAustraliaV2Host, verifyAuV2SessionToken } from "@/lib/auV2TestSession";

const MAX_PROMPT = 2000;
const MAX_PROVIDERS = 4;

function isProviderId(value: unknown): value is AIProviderId {
  return typeof value === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  if (!isAustraliaV2Host(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const cookieStore = await cookies();
  if (!verifyAuV2SessionToken(cookieStore.get(AU_V2_COOKIE)?.value)) {
    return NextResponse.json({ error: "Australia V2 test session required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
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
    "You are answering inside the isolated Australia V2 test room.",
    "Answer the user's question only.",
    "Do not execute tools, browse, modify files, create branches, commit code, deploy, send messages, or take external actions.",
    "If the user asks for an external action, explain that this test room is answer-only.",
  ].join(" ");

  const responses = await Promise.all(providers.map(async (provider) => {
    try {
      const result = await getConnector(provider).complete({
        messages: [
          { role: "system", content: system },
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
