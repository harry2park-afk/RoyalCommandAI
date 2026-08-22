import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
    }

    const incoming = await request.formData();
    const audio = incoming.get("audio");
    const language = String(incoming.get("language") || "").trim();

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "audio required" }, { status: 400 });
    }

    const body = new FormData();
    body.append("file", audio, audio.name || "room-mic.webm");
    body.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1");
    body.append("response_format", "json");
    if (language) body.append("language", language);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      logger.error("voice.transcribe.openai_failed", {
        status: response.status,
        error: payload?.error?.message || payload?.error || "unknown",
      });
      return NextResponse.json(
        { error: payload?.error?.message || "Transcription failed" },
        { status: response.status },
      );
    }

    return NextResponse.json({
      ok: true,
      transcript: String(payload?.text || "").trim(),
      engine: "openai-audio-transcription",
    });
  } catch (error) {
    logger.error("voice.transcribe.failed", {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json({ error: "Voice transcription failed" }, { status: 500 });
  }
}
