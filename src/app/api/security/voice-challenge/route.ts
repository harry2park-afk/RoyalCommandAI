import { NextResponse } from "next/server";
import { randomInt } from "crypto";

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

function languageKey(value: string | null) {
  const lang = (value || "en").toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = languageKey(url.searchParams.get("lang"));
  const phrases = CHALLENGES[key];
  const phrase = phrases[randomInt(0, phrases.length)];

  return NextResponse.json(
    {
      challengeId: crypto.randomUUID(),
      phrase,
      language: key,
      expiresInSeconds: 90,
      purpose: "voice-liveness-challenge",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
