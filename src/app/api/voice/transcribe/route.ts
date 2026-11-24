import { guardRoomVoice } from "@/lib/rcv3/paid-service-guard";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const fail = (code: string, status: number, error: string, providerStatus?: number) => {
    // Diagnostic metadata only: never log audio, transcript, key or provider body.
    logger.warn("voice.transcribe.failed", { requestId, code, status, providerStatus, elapsedMs: Date.now() - started });
    return NextResponse.json({ error, code, requestId }, { status });
  };
  logger.info("voice.transcribe.received", { requestId });
  try {
    const user = await getCurrentUser();
    if (!user) return fail("VOICE_AUTH", 401, "Unauthorized");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return fail("VOICE_CONFIG", 503, "Voice transcription is not configured");

    const incoming = await request.formData();
    await guardRoomVoice(user.id,incoming.get("roomId"));
    const audio = incoming.get("audio");
    const language = String(incoming.get("language") || "").trim();
    if (!(audio instanceof File) || audio.size === 0) return fail("VOICE_AUDIO", 400, "Audio required");

    const body = new FormData();
    body.append("file", audio, audio.name || "room-mic.webm");
    body.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1");
    body.append("response_format", "json");
    if (language) body.append("language", language);
    logger.info("voice.transcribe.provider_started", { requestId, audioBytes: audio.size });
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body,
      cache: "no-store", signal: AbortSignal.timeout(35000),
    });
    if (!response.ok) return fail("VOICE_PROVIDER", 502, "Voice transcription service failed", response.status);
    let payload;
    try { payload = await response.json(); }
    catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw error;
      return fail("VOICE_PROVIDER", 502, "Invalid voice transcription response", response.status);
    }
    const transcript = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!transcript) return fail("VOICE_EMPTY", 422, "No speech recognized");
    logger.info("voice.transcribe.completed", { requestId, elapsedMs: Date.now() - started });
    return NextResponse.json({ ok: true, transcript, engine: "openai-audio-transcription", requestId });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return fail(timeout ? "VOICE_TIMEOUT" : "VOICE_INTERNAL", timeout ? 504 : 500,
      timeout ? "Voice transcription timed out" : "Voice transcription failed");
  }
}
