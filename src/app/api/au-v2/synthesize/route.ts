import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import { AI_PROVIDER_IDS, PROVIDER_LABELS, type AIProviderId } from "@/lib/ai/types";
import { AU_V2_COOKIE, isAustraliaV2Host, verifyAuV2SessionToken } from "@/lib/auV2TestSession";

function isProviderId(value: unknown): value is AIProviderId {
  return typeof value === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

type SourceAnswer = { provider: AIProviderId; content: string; error?: string };

function isSourceAnswer(value: unknown): value is SourceAnswer {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isProviderId(item.provider) && typeof item.content === "string" && item.content.trim().length > 0;
}

export async function POST(request: Request) {
  if (!isAustraliaV2Host(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const cookieStore = await cookies();
  if (!verifyAuV2SessionToken(cookieStore.get(AU_V2_COOKIE)?.value)) {
    return NextResponse.json({ error: "Australia V2 test session required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const originalPrompt = typeof body.originalPrompt === "string" ? body.originalPrompt.trim() : "";
  const synthesizer = isProviderId(body.synthesizer) ? body.synthesizer : null;
  const rawResponses: unknown[] = Array.isArray(body.responses) ? body.responses : [];
  const responses: SourceAnswer[] = rawResponses
    .filter(isSourceAnswer)
    .map((item) => ({ provider: item.provider, content: item.content.trim(), error: item.error }))
    .filter((item) => !item.error)
    .slice(0, 4);

  if (!originalPrompt || !synthesizer || responses.length < 2) {
    return NextResponse.json({ error: "Two or more valid AI answers and a synthesizer are required." }, { status: 400 });
  }
  if (!getAvailableProviderIds().includes(synthesizer)) {
    return NextResponse.json({ error: "Selected synthesizer is not connected." }, { status: 400 });
  }

  const sourceText = responses
    .map((item, index) => `### ${index + 1}. ${PROVIDER_LABELS[item.provider]}\n${item.content}`)
    .join("\n\n");

  const prompt = [
    "You are the synthesis AI in the isolated Australia V2 test room.",
    "Compare independent AI answers instead of simply choosing one or following majority opinion.",
    "For each answer identify strengths, weaknesses, uncertainty, and anything that is hard to evaluate.",
    "Identify conflicts, missing evidence, and checks that would improve confidence.",
    "Then combine the strongest supported parts into one final answer and explain briefly why that conclusion was chosen.",
    "Do not execute tools or external actions.",
    "Respond in Korean unless the user's question clearly requires another language.",
    "",
    `Original question:\n${originalPrompt}`,
    "",
    `Independent answers:\n${sourceText}`,
  ].join("\n");

  try {
    const result = await getConnector(synthesizer).complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      maxTokens: 2200,
    });
    if (result.error || !result.content.trim()) {
      return NextResponse.json({ error: result.error || "Synthesis returned no answer." }, { status: 502 });
    }
    return NextResponse.json({ finalAnswer: result.content, synthesizer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Synthesis failed." }, { status: 502 });
  }
}
