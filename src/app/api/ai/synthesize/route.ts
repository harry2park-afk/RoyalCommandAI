import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import { buildSynthesisPrompt, validateSynthesisRequest } from "@/lib/ai/synthesisRequest";
import { PROVIDER_LABELS } from "@/lib/ai/types";
import { localDb } from "@/lib/local-store";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export const maxDuration = 240;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = validateSynthesisRequest(await request.json());

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data: room } = await supabase
        .from("rooms")
        .select("id")
        .eq("id", input.roomId)
        .eq("room_owner_id", user.id)
        .single();
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    } else if (!localDb.getRoom(input.roomId)) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!getAvailableProviderIds().includes(input.synthesizer)) {
      return NextResponse.json({ error: `${PROVIDER_LABELS[input.synthesizer]} is not connected.` }, { status: 409 });
    }

    const connector = getConnector(input.synthesizer);
    const started = Date.now();
    const response = await connector.complete({
      messages: [
        {
          role: "system",
          content: "You are the Royal Command synthesis reviewer. Follow the synthesis instructions exactly and never claim evidence you were not given.",
        },
        { role: "user", content: buildSynthesisPrompt(input) },
      ],
      temperature: 0.2,
      maxTokens: 6000,
    });

    if (response.error || !response.content.trim()) {
      logger.warn("synthesis.provider_failed", { roomId: input.roomId, provider: input.synthesizer, error: response.error || "empty" });
      return NextResponse.json({ error: response.error || "The synthesis AI returned no answer." }, { status: 502 });
    }

    const finalAnswer = `### 통합 답변 — ${PROVIDER_LABELS[input.synthesizer]}\n${response.content.trim()}`;
    const metadata = {
      synthesis: true,
      synthesizer: input.synthesizer,
      sourceProviders: input.responses.map((item) => item.provider),
      sourceCount: input.responses.length,
      latencyMs: Date.now() - started,
    };

    let aiMessage: unknown = null;
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("messages")
        .insert({
          room_id: input.roomId,
          author_type: "ai",
          content: finalAnswer,
          language: input.language,
          metadata,
        })
        .select("*")
        .single();
      aiMessage = data;
    } else {
      aiMessage = localDb.addMessage({
        roomId: input.roomId,
        authorType: "ai",
        content: finalAnswer,
        language: input.language,
        metadata,
      });
    }

    logger.info("synthesis.completed", {
      roomId: input.roomId,
      synthesizer: input.synthesizer,
      sourceProviders: input.responses.map((item) => item.provider),
      latencyMs: Date.now() - started,
    });

    return NextResponse.json({
      finalAnswer,
      synthesizer: input.synthesizer,
      sourceProviders: input.responses.map((item) => item.provider),
      aiMessage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synthesis failed.";
    logger.warn("synthesis.rejected", { error: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
