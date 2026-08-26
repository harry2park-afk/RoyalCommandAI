import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseJsonObject } from "@/lib/ai/devAgentCodec";
import { logger } from "@/lib/logger";

export const maxDuration = 120;

const CODEX_MODEL = process.env.OPENAI_CODEX_MODEL || "gpt-5.3-codex";
const CODEX_TIMEOUT_MS = 90_000;
const OWNER_DEV_EMAILS = ["harry2park@gmail.com", "harry@royalcommand.ai"];

function developerEmails() {
  const configured = (process.env.ROYAL_COMMAND_DEV_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...OWNER_DEV_EMAILS, ...configured]));
}

function isDeveloper(email: string) {
  return developerEmails().includes(email.toLowerCase());
}

function workId(roomId: string, prompt: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const key = createHash("sha256").update(`${roomId}\n${prompt}`).digest("hex").slice(0, 8).toUpperCase();
  return `RC-${date}-${key}`;
}

function responseText(body: Record<string, unknown>) {
  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text.trim();
  const output = Array.isArray(body.output) ? body.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        parts.push((part as { text: string }).text);
      }
    }
  }
  return parts.join("\n").trim();
}

async function codexJson(prompt: string) {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured for the Codex specialist");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CODEX_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CODEX_MODEL,
        input: prompt,
        reasoning: { effort: "medium" },
        max_output_tokens: 8000,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    let body: Record<string, unknown> = {};
    try { body = text ? JSON.parse(text) as Record<string, unknown> : {}; }
    catch { throw new Error(`Codex returned non-JSON HTTP ${response.status}`); }
    if (!response.ok) {
      const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : {};
      throw new Error(String(error.message || `Codex Responses API HTTP ${response.status}`));
    }
    const output = responseText(body);
    if (!output) throw new Error("Codex returned an empty specialist response");
    return parseJsonObject(output);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Explicit Codex specialist only.
 *
 * Normal RC Room executable development is owned by:
 * /api/ai/chat/stream -> /api/dev/agent
 * for openai, anthropic, google, and xai.
 *
 * This route intentionally has no GitHub writer so it can never silently
 * substitute Codex for the provider selected by the user.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isDeveloper(user.email)) return NextResponse.json({ error: "Developer access is not enabled for this account" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    if (body?.specialist !== "codex" && body?.specialist !== true) {
      return NextResponse.json({
        error: "RC Builder is an explicit Codex specialist analysis path. Use /api/ai/chat/stream for Room execution or /api/dev/agent for ChatGPT, Claude, Gemini, and Grok.",
        code: "CODEX_SPECIALIST_EXPLICIT_OPT_IN_REQUIRED",
      }, { status: 409 });
    }

    const roomId = String(body?.roomId || "").trim();
    const prompt = String(body?.prompt || "").trim();
    if (!roomId || !prompt) return NextResponse.json({ error: "roomId and prompt are required" }, { status: 400 });

    const result = await codexJson([
      "You are the explicit Royal Command Codex specialist.",
      "Analyse the request only. Do not claim GitHub execution, commits, branches, PRs, or deployment.",
      "Return strict JSON only: {\"summary\":\"...\",\"recommendations\":[\"...\"]}.",
      "",
      prompt,
    ].join("\n"));

    const id = workId(roomId, prompt);
    logger.info("builder.codex_specialist.completed", { roomId, workId: id, model: CODEX_MODEL });
    return NextResponse.json({
      ok: true,
      specialist: "codex",
      executed: false,
      workId: id,
      model: CODEX_MODEL,
      summary: String(result?.summary || "Analysis completed."),
      recommendations: Array.isArray(result?.recommendations) ? result.recommendations : [],
      executionAuthority: "/api/dev/agent",
    });
  } catch (error) {
    logger.error("builder.codex_specialist.failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Codex specialist failed" }, { status: 502 });
  }
}
