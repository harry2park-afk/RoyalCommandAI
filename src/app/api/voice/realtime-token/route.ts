import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 15;

function normaliseLanguage(value: string | null) {
  const raw = (value || "").trim().toLowerCase();
  if (raw === "ko" || raw === "kr") return "ko";
  if (raw === "ja" || raw === "jp") return "ja";
  if (raw === "zh" || raw === "zh-cn" || raw === "cn") return "zh-cn";
  if (raw === "zh-tw" || raw === "tw") return "zh-tw";
  return "en";
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });

    const url = new URL(request.url);
    const language = normaliseLanguage(url.searchParams.get("lang"));
    const languages = language === "ko"
      ? ["ko", "en"]
      : language === "en"
        ? ["ko", "en"]
        : [language, "ko", "en"];

    const body = {
      expires_after: { anchor: "created_at", seconds: 120 },
      session: {
        type: "transcription",
        audio: {
          input: {
            noise_reduction: { type: "near_field" },
            transcription: {
              model: process.env.OPENAI_REALTIME_TRANSCRIBE_MODEL || "gpt-live-transcribe",
              languages,
              delay: "minimal",
              prompt: "Royal Command room dictation. Preserve names, numbers, punctuation, Korean and English accurately. The user may switch naturally between Korean and English. Common terms: Royal Command, ChatGPT, Claude, Gemini, Grok, Katie, Kevin.",
              keywords: ["Royal Command", "ChatGPT", "Claude", "Gemini", "Grok", "Katie", "Kevin"],
            },
          },
        },
      },
    };

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    const text = await response.text();
    let payload: any = {};
    try { payload = text ? JSON.parse(text) : {}; } catch {}

    if (!response.ok) {
      logger.error("voice.realtime_token.openai_failed", {
        status: response.status,
        body: text.slice(0, 800),
      });
      return Response.json({ error: payload?.error?.message || "Realtime token request failed" }, { status: response.status });
    }

    const value = String(payload?.value || "");
    if (!value) return Response.json({ error: "Realtime token missing" }, { status: 502 });

    return Response.json({ value, expires_at: payload?.expires_at || null }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logger.error("voice.realtime_token.failed", {
      error: error instanceof Error ? error.message : error,
    });
    return Response.json({ error: "Realtime token unavailable" }, { status: 502 });
  }
}
