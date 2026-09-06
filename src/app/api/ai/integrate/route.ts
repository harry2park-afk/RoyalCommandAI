import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import { PROVIDER_LABELS, type AIProviderId } from "@/lib/ai/types";

export const maxDuration = 120;

const INTEGRATOR_PROVIDER: AIProviderId = "openai";

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
  if (!frozen.length) return NextResponse.json({ error: "Frozen results are required" }, { status: 400 });
  if (!getAvailableProviderIds().includes(INTEGRATOR_PROVIDER)) {
    return NextResponse.json({ error: "Integration engine is not connected" }, { status: 503 });
  }

  const normalized = frozen.map((item: unknown) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      provider: String(row.provider || "unknown"),
      providerName: String(row.providerName || row.provider || "unknown"),
      content: String(row.content || ""),
      receipt: row.receipt || null,
    };
  }).filter((item) => item.content.trim());

  if (!normalized.length) return NextResponse.json({ error: "No completed provider results to integrate" }, { status: 400 });

  const connector = getConnector(INTEGRATOR_PROVIDER);
  const source = normalized.map((item, index) => [
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
    sourceProviders: normalized.map((item) => item.provider),
    receipt: {
      integrationId,
      terminal: true,
      completedAt: new Date().toISOString(),
    },
  }, { status: result.error ? 502 : 200 });
}
