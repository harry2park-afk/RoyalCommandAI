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

class StageTimeout extends Error {
  constructor(public stage: string) { super("Voice stage timeout"); }
}

async function bounded<T>(stage: string, ms: number, operation: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new StageTimeout(stage)), ms); }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function POST(request: Request) {
  const started = Date.now();
  const trace = request.headers.get("x-rc-voice-trace") || "";
  const requestId = /^[a-f0-9-]{36}$/.test(trace) ? trace : crypto.randomUUID();
  let stage = "auth";
  const mark = (name: string) => logger.info("voice.realtime.stage", { requestId, stage: name, elapsedMs: Date.now() - started });
  const fail = (code: string, status: number, providerStatus?: number) => {
    logger.warn("voice.realtime.failed", { requestId, stage, code, status, providerStatus, elapsedMs: Date.now() - started });
    return Response.json({ error: "실시간 음성 연결에 실패했습니다.", code, requestId }, { status, headers: { "Cache-Control": "no-store" } });
  };
  try {
    mark("auth_started");
    const user = await bounded("auth", 5000, () => getCurrentUser());
    if (!user) return fail("VOICE_AUTH", 401);
    mark("auth_completed");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return fail("VOICE_CONFIG", 503);

    stage = "sdp";
    mark("sdp_started");
    const sdp = await bounded("sdp", 2000, () => request.text());
    if (!sdp || !sdp.includes("v=0")) {
      return fail("VOICE_SDP", 400);
    }

    mark("sdp_completed");
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

    stage = "provider";
    mark("provider_started");
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) controller.abort();
    let response: Response;
    let answer: string;
    try {
      ({ response, answer } = await bounded("provider", 15000, async () => {
        const form = new FormData();
        form.set("sdp", sdp);
        form.set("session", JSON.stringify(session));
        const response = await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST", headers: { Authorization: `Bearer ${apiKey}` },
          body: form, cache: "no-store", signal: controller.signal,
        });
        mark("provider_headers_received");
        return { response, answer: await response.text() };
      }));
    } finally {
      controller.abort();
      request.signal.removeEventListener("abort", abort);
    }
    if (!response.ok) {
      const code = [401, 403].includes(response.status) ? "VOICE_PROVIDER_AUTH"
        : response.status === 429 ? "VOICE_PROVIDER_LIMIT"
        : response.status >= 500 ? "VOICE_PROVIDER_UNAVAILABLE" : "VOICE_PROVIDER_REQUEST";
      return fail(code, 502, response.status);
    }
    if (!answer.startsWith("v=0")) return fail("VOICE_PROVIDER_RESPONSE", 502, response.status);
    mark("connected");

    return new Response(answer, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof StageTimeout) return fail(`VOICE_${error.stage.toUpperCase()}_TIMEOUT`, 504);
    if (request.signal.aborted) return fail("VOICE_CANCELLED", 499);
    return fail("VOICE_CONNECTION", 502);
  }
}
