import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import { AI_PROVIDER_IDS, type AIProviderId } from "@/lib/ai/types";
import { verifyIndependentReceipt, type IndependentReceiptPayload } from "@/lib/ai/independentReceipt";

export const maxDuration = 120;

const INTEGRATOR_PROVIDER: AIProviderId = "openai";
const MAX_PROMPT_CHARS = 40_000;
const MAX_RESULTS = 5;
const MAX_RESULT_CHARS = 40_000;
const MAX_TOTAL_RESULT_CHARS = 120_000;

type FrozenResult = {
  provider: string;
  providerName: string;
  content: string;
  receipt: IndependentReceiptPayload & { signature: string };
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const integrationId = typeof body?.integrationId === "string" ? body.integrationId : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const frozen = Array.isArray(body?.frozenResults) ? body.frozenResults : [];
  const language = typeof body?.language === "string" ? body.language : user.defaultLanguage || "en";

  if (!integrationId) return NextResponse.json({ error: "integrationId is required" }, { status: 400 });
  if (!prompt) return NextResponse.json({ error: "Original prompt is required" }, { status: 400 });
  if (prompt.length > MAX_PROMPT_CHARS) return NextResponse.json({ error: "Original prompt is too long" }, { status: 413 });
  if (!frozen.length) return NextResponse.json({ error: "Frozen results are required" }, { status: 400 });
  if (frozen.length > MAX_RESULTS) return NextResponse.json({ error: "Too many provider results" }, { status: 413 });
  if (!getAvailableProviderIds().includes(INTEGRATOR_PROVIDER)) {
    return NextResponse.json({ error: "Integration engine is not connected" }, { status: 503 });
  }

  const normalized: FrozenResult[] = frozen.map((item: unknown): FrozenResult | null => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const provider = typeof row.provider === "string" && AI_PROVIDER_IDS.includes(row.provider as AIProviderId) ? row.provider as AIProviderId : null;
    const receiptRow = row.receipt && typeof row.receipt === "object" ? row.receipt as Record<string, unknown> : {};
    const receipt = provider && receiptRow.terminal === true && receiptRow.provider === provider && typeof receiptRow.requestId === "string" && typeof receiptRow.completedAt === "string"
      ? { requestId: receiptRow.requestId, provider, terminal: true as const, completedAt: receiptRow.completedAt }
      : null;
    if (!provider || !receipt || !verifyIndependentReceipt(user.id, receipt, receiptRow.signature)) return null;
    return {
      provider,
      providerName: String(row.providerName || row.provider || "unknown"),
      content: String(row.content || "").slice(0, MAX_RESULT_CHARS),
      receipt: { ...receipt, signature: String(receiptRow.signature) },
    };
  }).filter((item: FrozenResult | null): item is FrozenResult => Boolean(item?.content.trim()));

  if (!normalized.length) return NextResponse.json({ error: "No completed provider results to integrate" }, { status: 400 });
  if (new Set(normalized.map((item) => item.provider)).size !== normalized.length) return NextResponse.json({ error: "Duplicate provider results" }, { status: 400 });
  if (normalized.reduce((total, item) => total + item.content.length, 0) > MAX_TOTAL_RESULT_CHARS) return NextResponse.json({ error: "Provider results are too large" }, { status: 413 });

  const connector = getConnector(INTEGRATOR_PROVIDER);
  const source = normalized.map((item: FrozenResult, index: number) => [
    `RESULT ${index + 1}`,
    `Provider: ${item.providerName} (${item.provider})`,
    item.content,
  ].join("\n")).join("\n\n---\n\n");

  const result = await connector.complete({
    messages: [
      {
        role: "system",
        content: [
          "You are the Royal Command Final Integrator, a separate read-only integration role.",
          "You may read only the frozen provider results supplied in this request.",
          "Do not alter, rewrite, or impersonate the source provider results.",
          "Synthesize a final answer that identifies consensus, disagreements, risks, and the strongest recommendation.",
          "Never invent a missing provider result or claim that an unavailable provider agreed.",
          `Reply in ${language === "ko" ? "Korean" : language === "en" ? "English" : language}.`,
        ].join("\n"),
      },
      {
        role: "user",
        content: `ORIGINAL QUESTION:\n${prompt}\n\nFROZEN PROVIDER RESULTS:\n${source}`,
      },
    ],
  });

  return NextResponse.json({
    integrationId,
    provider: INTEGRATOR_PROVIDER,
    providerName: "Final Integrator",
    model: result.model,
    content: result.content,
    latencyMs: result.latencyMs,
    error: result.error || null,
    sourceProviders: normalized.map((item: FrozenResult) => item.provider),
    receipt: {
      integrationId,
      terminal: true,
      completedAt: new Date().toISOString(),
    },
  }, { status: result.error ? 502 : 200 });
}
