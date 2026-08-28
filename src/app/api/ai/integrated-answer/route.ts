import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executeModelBinding, resolveModelExecutionBinding } from "@/lib/ai/modelExecutionBinding";
import { getModelRegistryEntry, type AIModelId } from "@/lib/ai/modelRegistry";
import { AI_PROVIDER_IDS, PROVIDER_LABELS, type AIProviderId } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { localDb } from "@/lib/local-store";

const CONNECTED_MODEL_IDS = new Set<AIModelId>([
  "openai:gpt-5.6-sol",
  "google:gemini-3.7-flash",
  "xai:grok-4.5",
]);

function isProviderId(value: unknown): value is AIProviderId {
  return typeof value === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

type SourceAnswer = { provider: AIProviderId; content: string; error?: string };

function isSourceAnswer(value: unknown): value is SourceAnswer {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isProviderId(item.provider) && typeof item.content === "string" && item.content.trim().length > 1;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
    const originalPrompt = typeof body.originalPrompt === "string" ? body.originalPrompt.trim() : "";
    const rawModelId = typeof body.modelId === "string" ? body.modelId.trim() : "";
    const modelId = rawModelId as AIModelId;
    const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "ko";
    const rawResponses: unknown[] = Array.isArray(body.responses) ? body.responses : [];
    const responses = rawResponses
      .filter(isSourceAnswer)
      .map((item) => ({ provider: item.provider, content: item.content.trim(), error: item.error }))
      .filter((item) => !item.error)
      .slice(0, 4);

    if (!roomId || !originalPrompt || !CONNECTED_MODEL_IDS.has(modelId) || responses.length < 2) {
      return NextResponse.json({ error: "A connected model and at least two valid AI answers are required." }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data: room } = await supabase
        .from("rooms")
        .select("id")
        .eq("id", roomId)
        .eq("room_owner_id", user.id)
        .single();
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    } else if (!localDb.getRoom(roomId)) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const model = getModelRegistryEntry(modelId);
    const binding = resolveModelExecutionBinding(model.providerId, model.id);
    const sourceText = responses
      .map((item, index) => `### ${index + 1}. ${PROVIDER_LABELS[item.provider]}\n${item.content}`)
      .join("\n\n");

    const prompt = [
      `You are ${model.displayName}, the user-selected Integrated Answer model in Royal Command.`,
      "Compare the independent AI answers. Do not choose by majority, length, or provider brand.",
      "Identify useful contributions, weaknesses, conflicts, uncertainty, and missing evidence.",
      "Resolve conflicts only where the supplied reasoning supports it; otherwise preserve the uncertainty.",
      "Then produce one improved direct answer to the original user question using the strongest supported material.",
      "Do not invent evidence, citations, tool results, or consensus.",
      `Respond in ${language === "ko" ? "Korean" : language === "en" ? "English" : language}.`,
      "",
      `ORIGINAL QUESTION:\n${originalPrompt}`,
      "",
      `SOURCE ANSWERS:\n${sourceText}`,
    ].join("\n");

    const isGpt56 = model.id.startsWith("openai:gpt-5.6-");
    const maxTokens = model.id === "xai:grok-4.5" ? 4200 : 2200;
    const started = Date.now();
    const result = await executeModelBinding(binding, {
      messages: [{ role: "user", content: prompt }],
      ...(isGpt56 ? {} : { temperature: 0.2 }),
      maxTokens,
    });

    if (result.error || !result.content.trim()) {
      return NextResponse.json({ error: result.error || "Integrated Answer returned no answer." }, { status: 502 });
    }

    const finalAnswer = `### Integrated Answer — ${model.displayName}\n${result.content.trim()}`;
    const metadata = {
      integratedAnswer: true,
      modelId: model.id,
      modelName: model.displayName,
      providerId: model.providerId,
      sourceProviders: responses.map((item) => item.provider),
      sourceCount: responses.length,
      latencyMs: Date.now() - started,
    };

    let aiMessage: unknown = null;
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("messages")
        .insert({
          room_id: roomId,
          author_type: "ai",
          content: finalAnswer,
          language,
          metadata,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      aiMessage = data;
    } else {
      aiMessage = localDb.addMessage({
        roomId,
        authorType: "ai",
        content: finalAnswer,
        language,
        metadata,
      });
    }

    return NextResponse.json({
      finalAnswer,
      modelId: model.id,
      modelName: model.displayName,
      providerId: model.providerId,
      latencyMs: metadata.latencyMs,
      aiMessage,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Integrated Answer failed." }, { status: 502 });
  }
}
