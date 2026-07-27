import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { orchestrate } from "@/lib/ai/orchestrator";
import { chatSchema } from "@/lib/validations";
import { localDb } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = chatSchema.parse(body);
    const language = data.language || user.defaultLanguage;

    const result = await orchestrate({
      prompt: data.prompt,
      history: data.history,
      providers: data.providers,
      language,
    });

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data: userMsg } = await supabase
        .from("messages")
        .insert({
          room_id: data.roomId,
          author_id: user.id,
          author_type: "user",
          content: data.prompt,
          language,
        })
        .select("*")
        .single();

      const { data: aiMsg } = await supabase
        .from("messages")
        .insert({
          room_id: data.roomId,
          author_type: "ai",
          content: result.finalAnswer,
          language,
          metadata: {
            blocked: result.blocked,
            comparison: result.comparison,
            providers: result.providers,
          },
        })
        .select("*")
        .single();

      await supabase.from("ai_runs").insert({
        room_id: data.roomId,
        message_id: aiMsg?.id,
        prompt: data.prompt,
        providers: result.providers,
        responses: result.responses,
        final_answer: result.finalAnswer,
        comparison: result.comparison,
        status: result.blocked
          ? "completed"
          : result.responses.some((r) => r.error)
            ? "partial"
            : "completed",
        latency_ms: result.latencyMs,
        created_by: user.id,
      });

      return NextResponse.json({
        ...result,
        userMessage: userMsg,
        aiMessage: aiMsg,
      });
    }

    const userMessage = localDb.addMessage({
      roomId: data.roomId,
      authorType: "user",
      content: data.prompt,
      language,
    });
    const aiMessage = localDb.addMessage({
      roomId: data.roomId,
      authorType: "ai",
      content: result.finalAnswer,
      language,
      metadata: {
        blocked: result.blocked,
        comparison: result.comparison,
        providers: result.providers,
        responses: result.responses.map((r) => ({
          provider: r.provider,
          model: r.model,
          content: r.content,
          latencyMs: r.latencyMs,
          error: r.error,
        })),
      },
    });

    logger.info("chat.completed", {
      roomId: data.roomId,
      latencyMs: result.latencyMs,
      blocked: result.blocked,
    });

    return NextResponse.json({
      ...result,
      userMessage,
      aiMessage,
    });
  } catch (error) {
    logger.error("chat.failed", {
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Chat orchestration failed" }, { status: 500 });
  }
}
