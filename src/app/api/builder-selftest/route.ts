import { NextResponse } from "next/server";

export const maxDuration = 60;

const CODEX_MODEL = process.env.OPENAI_CODEX_MODEL || "gpt-5.3-codex";

function responseText(body: any) {
  if (typeof body?.output_text === "string" && body.output_text.trim()) return body.output_text.trim();
  const parts: string[] = [];
  for (const item of Array.isArray(body?.output) ? body.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Preview-only self-test" }, { status: 404 });
  }

  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) return NextResponse.json({ ok: false, model: CODEX_MODEL, error: "OPENAI_API_KEY missing" }, { status: 500 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CODEX_MODEL,
        input: "Royal Command RC Builder live connectivity self-test. Reply with exactly: RC_CODEX_LIVE_OK",
        reasoning: { effort: "high" },
        max_output_tokens: 512,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const raw = await response.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch {}
    const output = responseText(body);
    if (!response.ok) {
      return NextResponse.json({ ok: false, model: CODEX_MODEL, status: response.status, error: body?.error?.message || "Responses API failed" }, { status: 502 });
    }
    return NextResponse.json({
      ok: output.includes("RC_CODEX_LIVE_OK"),
      model: body?.model || CODEX_MODEL,
      responseId: body?.id || null,
      marker: output,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, model: CODEX_MODEL, error: controller.signal.aborted ? "timeout" : (error instanceof Error ? error.message : "self-test failed") }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}
