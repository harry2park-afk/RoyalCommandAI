import { NextResponse } from "next/server";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

const CHALLENGES = {
  ko: [
    "로열 커맨드, 지금 문을 열어라",
    "황금 열쇠로 왕실 문을 열어라",
    "로열 커맨드, 나의 명령을 확인하라",
    "왕실 경비대, 안전한 문을 열어라",
  ],
  en: [
    "Royal Command, open the secure gate now",
    "Royal Guard, confirm my command and open the gate",
    "Royal Command, unlock the golden gate",
    "Royal Guard, verify me and open the secure door",
  ],
  ja: [
    "ロイヤルコマンド、安全な門を開けてください",
    "ロイヤルガード、私の命令を確認してください",
  ],
};

const TTL_SECONDS = 90;

type LanguageKey = keyof typeof CHALLENGES;

type ChallengePayload = {
  id: string;
  phrase: string;
  language: LanguageKey;
  exp: number;
  purpose: "voice-liveness-challenge";
};

function languageKey(value: string | null): LanguageKey {
  const lang = (value || "en").toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

function normalise(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,!?;:'\"“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function secret() {
  return (
    process.env.VOICE_CHALLENGE_SECRET ||
    process.env.STEP_UP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

function encode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(encodedPayload: string, signingSecret: string) {
  return createHmac("sha256", signingSecret).update(encodedPayload).digest("base64url");
}

function makeToken(payload: ChallengePayload, signingSecret: string) {
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, signingSecret)}`;
}

function readToken(token: string, signingSecret: string): ChallengePayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded, signingSecret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(decode(encoded)) as ChallengePayload;
    if (payload.purpose !== "voice-liveness-challenge") return null;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const signingSecret = secret();
  if (!signingSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        enabled: false,
        error: "Royal Voice Challenge requires VOICE_CHALLENGE_SECRET before production activation.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(request.url);
  const key = languageKey(url.searchParams.get("lang"));
  const phrases = CHALLENGES[key];
  const phrase = phrases[randomInt(0, phrases.length)];
  const payload: ChallengePayload = {
    id: crypto.randomUUID(),
    phrase,
    language: key,
    exp: Date.now() + TTL_SECONDS * 1000,
    purpose: "voice-liveness-challenge",
  };

  const token = makeToken(payload, signingSecret || "royal-command-development-only");

  return NextResponse.json(
    {
      enabled: true,
      challengeId: payload.id,
      challengeToken: token,
      phrase,
      language: key,
      expiresInSeconds: TTL_SECONDS,
      purpose: payload.purpose,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: Request) {
  const signingSecret = secret();
  if (!signingSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { verified: false, error: "Voice challenge verification is not activated." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = (await request.json()) as {
    challengeToken?: string;
    transcript?: string;
  };

  if (!body.challengeToken || !body.transcript) {
    return NextResponse.json(
      { verified: false, error: "Challenge token and transcript are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payload = readToken(
    body.challengeToken,
    signingSecret || "royal-command-development-only",
  );
  if (!payload) {
    return NextResponse.json(
      { verified: false, error: "Voice challenge expired or is invalid." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const verified = normalise(payload.phrase) === normalise(body.transcript);
  return NextResponse.json(
    {
      verified,
      challengeId: payload.id,
      expiresAt: payload.exp,
      next: verified ? "device-verification" : "retry-voice-challenge",
    },
    { status: verified ? 200 : 401, headers: { "Cache-Control": "no-store" } },
  );
}
