import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { translateSchema } from "@/lib/validations";
import { orchestrate } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = translateSchema.parse(body);

    const result = await orchestrate({
      prompt: data.text,
      language: data.targetLanguage,
      systemExtra: `Translate the user text into ${data.targetLanguage}. Preserve meaning. Return only the translation.`,
      providers: undefined,
    });

    return NextResponse.json({
      original: data.text,
      translated: result.finalAnswer,
      targetLanguage: data.targetLanguage,
      providers: result.providers,
    });
  } catch (error) {
    logger.error("translate.failed", {
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
