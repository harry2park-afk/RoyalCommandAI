import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

function normaliseLanguage(value: string | null) {
  const raw = (value || "").trim().toLowerCase();
  if (raw === "ko" || raw === "kr") return "ko";
  if (raw === "ja" || raw === "jp") return "ja";
  if (raw === "zh" || raw === "zh-cn" || raw === "cn") return "zh-cn";
  if (raw === "zh-tw" || raw === "tw") return "zh-tw";
  if (raw === "es") return "es";
  if (raw === "fr") return "fr";
  if (raw === "de") return "de";
  return "en";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
    }

    const sdp = await request.text();
    if (!sdp || !sdp.includes("v=0")) {
      return Response.json({ error: "Valid SDP is required" }, { status: 400 });
    }

    const url = new URL(request.url);
    const primaryLanguage = normaliseLanguage(url.searchParams.get("lang"));
    const languages = primaryLanguage === "en" ? ["en"] : [primaryLanguage, "en"];

    const session = {
      type: "transcription",
      audio: {
        input: {
          transcription: {
            model: process.env.OPENAI_REALTIME_TRANSCRIBE_MODEL || "gpt-live-transcribe",
            languages,
            delay: "minimal",
            prompt: "Royal Command room dictation. Preserve names, numbers, punctuation, Korean and English accurately. Common terms: Royal Command, ChatGPT, Claude, Gemini, Grok, Katie, Kevin.",
            keywords: ["Royal Command", "ChatGPT", "Claude", "Gemini", "Grok", "Katie", "Kevin"],
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.45,
            prefix_padding_ms: 300,
            silence_duration_ms: 650,
          },
        },
      },
    };

    const form = new FormData();
    form.set("sdp", sdp);
    form.set("session", JSON.stringify(session));

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
      cache: "no-store",
    });

    const answer = await response.text();
    if (!response.ok) {
      logger.error("voice.realtime_session.openai_failed", {
        status: response.status,
        body: answer.slice(0, 1000),
      });
      return Response.json(
        { error: answer || `Realtime session failed with HTTP ${response.status}` },
        { status: response.status },
      );
    }

    return new Response(answer, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("voice.realtime_session.failed", {
      error: error instanceof Error ? error.message : error,
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "Realtime session failed" },
      { status: 500 },
    );
  }
}
