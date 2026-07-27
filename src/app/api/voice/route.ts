import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

/** Browser STT primary; this endpoint accepts transcript text or returns TTS-ready payload. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const mode = body.mode as "stt-ack" | "tts";
    const text = String(body.text || "");

    if (mode === "tts") {
      if (!text) {
        return NextResponse.json({ error: "text required" }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        speak: text,
        language: body.language || user.defaultLanguage,
        engine: "browser-speech-synthesis",
      });
    }

    return NextResponse.json({
      ok: true,
      transcript: text,
      engine: "browser-speech-recognition",
      note: "Use Web Speech API in the client; server acknowledges and stores via chat API.",
    });
  } catch (error) {
    logger.error("voice.failed", {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json({ error: "Voice endpoint failed" }, { status: 500 });
  }
}
