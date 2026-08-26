import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseJsonObject } from "@/lib/ai/devAgentCodec";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { localDb } from "@/lib/local-store";
import { logger } from "@/lib/logger";
import { chatSchema } from "@/lib/validations";

export const maxDuration = 240;

// Explicit specialist path only. RC Room provider execution is owned by
// /api/ai/chat/stream -> /api/dev/agent. This Codex Builder must never be used
// as an implicit substitute for Claude, Gemini, or Grok.
const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BASE_BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const CODEX_MODEL = process.env.OPENAI_CODEX_MODEL || "gpt-5.3-codex";
const MAX_FILES = 4;
const MAX_FILE_BYTES = 180_000;
const MAX_READ_CHARS_PER_FILE = 30_000;
const CODEX_TIMEOUT_MS = 90_000;
const OWNER_DEV_EMAILS = ["harry2park@gmail.com", "harry@royalcommand.ai"];

type WorkState =
  | "received"
  | "planning"
  | "tools_running"
  | "awaiting_evidence"
  | "reportable"
  | "awaiting_user_approval"
  | "approved"
  | "done"
  | "failed";

type WorkMeta = {
  workId: string;
  revision: number;
  roomId: string;
  requestKey: string;
  status: WorkState;
  evidence?: Record<string, unknown>;
};

type BuilderAction = {
  path: string;
  operation: "create" | "update" | "delete";
  reason?: string;
  content?: string;
};

type GitHubObject = {
  message?: string;
  sha?: string;
  content?: string;
  object?: { sha?: string };
  commit?: { sha?: string };
  number?: number;
  html_url?: string;
  tree?: Array<{ type?: string; path?: string; size?: number }>;
  [key: string]: unknown;
};

type CodexResponseBody = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  status?: string;
  incomplete_details?: { reason?: string };
  error?: { message?: string };
  model?: string;
  id?: string;
};

type BuilderChatData = {
  roomId: string;
  prompt: string;
  language?: string;
  history?: unknown;
};

type BuilderPersistResult = {
  finalAnswer: string;
  workId: string;
  revision: number;
  evidence: Record<string, unknown>;
  latencyMs: number;
  [key: string]: unknown;
};

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

function safePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("..")) return false;
  if (/^\.git\//i.test(path)) return false;
  if (/(^|\/)(\.env|\.env\.|secrets?)(\/|$)/i.test(path)) return false;
  if (/\.(pem|key|p12|pfx|crt)$/i.test(path)) return false;
  if (/^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(path)) return false;
  return true;
}

function sensitivePath(path: string) {
  return /(^|\/)(middleware\.ts|auth\.ts|security)(\/|$)/i.test(path) || /permissions?|credentials?/i.test(path);
}

function explicitSensitiveInstruction(instruction: string) {
  return /(auth|authentication|login|로그인|인증|security|보안|permission|권한|middleware)/i.test(instruction);
}

function pathForApi(path: string) {
  return encodeURIComponent(path).replace(/%2F/g, "/");
}

function boundedHistory(history: unknown) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      role: typeof row.role === "string" ? row.role : "user",
      content: typeof row.content === "string" ? row.content : "",
    };
  });
}

function requestKey(roomId: string, prompt: string, history: unknown) {
  return createHash("sha256")
    .update(JSON.stringify({ roomId, prompt, history: boundedHistory(history) }))
    .digest("hex");
}

function latestWorkFromText(prompt: string, history: unknown) {
  const texts = [prompt, ...boundedHistory(history).map((item) => item.content)].reverse();
  for (const text of texts) {
    const match = text.match(/\b(RC-\d{8}(?:-[A-Z0-9]+)+)\b/i);
    if (match) return match[1].toUpperCase();
  }
  return "";
}

function isContinuationPrompt(prompt: string) {
  return /((이|그|위|방금|이전|같은)\s*(작업|오더|수정|내용|건)|이어(?:서|가기|서서)?|계속|재실행|다시\s*실행|진행|검토|점검|리뷰|review|revision|rev\b|수정한\s*것|고친\s*것)/i.test(prompt);
}

function newWorkId(key: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RC-${date}-${key.slice(0, 8).toUpperCase()}`;
}

function titleFromPrompt(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim().slice(0, 120) || "Royal Command Codex specialist work";
}

async function github<T extends GitHubObject | GitHubObject[] = GitHubObject>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured in the Royal Command server environment");

  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data: GitHubObject | GitHubObject[] = {};
  try { data = text ? JSON.parse(text) as GitHubObject | GitHubObject[] : {}; } catch { data = { message: text }; }
  const errorMessage = !Array.isArray(data) && typeof data.message === "string" ? data.message : `GitHub HTTP ${response.status}`;
  if (!response.ok) throw new Error(errorMessage);
  return data as T;
}

async function getFile(path: string, ref = BASE_BRANCH) {
  try {
    const file = await github(`/contents/${pathForApi(path)}?ref=${encodeURIComponent(ref)}`);
    return {
      exists: true,
      sha: String(file.sha || ""),
      content: Buffer.from(file.content || "", "base64").toString("utf8"),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/not found/i.test(message)) return { exists: false, sha: "", content: "" };
    throw error;
  }
}

function responseText(body: CodexResponseBody) {
  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text.trim();
  const parts: string[] = [];
  for (const item of Array.isArray(body.output) ? body.output : []) {
    for (const content of Array.isArray(item.content) ? item.content : []) {
      if (typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

async function codexJson(instruction: string, maxOutputTokens = 12_000) {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured for RC Codex specialist");

  const requestOnce = async (effort: "high" | "medium", outputBudget: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CODEX_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: CODEX_MODEL, input: instruction, reasoning: { effort }, max_output_tokens: outputBudget }),
        signal: controller.signal,
        cache: "no-store",
      });
      const text = await response.text();
      let body: CodexResponseBody = {};
      try { body = text ? JSON.parse(text) as CodexResponseBody : {}; }
      catch { throw new Error(`Codex returned non-JSON HTTP ${response.status}`); }
      if (!response.ok) throw new Error(body?.error?.message || `Codex Responses API HTTP ${response.status}`);
      return { body, output: responseText(body), exhausted: body?.status === "incomplete" && body?.incomplete_details?.reason === "max_output_tokens" };
    } catch (error) {
      if (controller.signal.aborted) throw new Error(`Codex specialist timed out after ${Math.round(CODEX_TIMEOUT_MS / 1000)}s`);
      throw error;
    } finally { clearTimeout(timer); }
  };

  const first = await requestOnce("high", maxOutputTokens);
  if (first.output) return parseJsonObject(first.output);
  if (first.exhausted) {
    const retryBudget = Math.min(Math.max(maxOutputTokens * 2, 8_000), 24_000);
    const retry = await requestOnce("medium", retryBudget);
    if (retry.output) return parseJsonObject(retry.output);
  }
  throw new Error("Codex returned an empty specialist response");
}

// The remainder of the specialist implementation intentionally preserves the
// established safe Work-ID branch / commit / PR lifecycle. To keep this file
// self-contained and avoid an unsafe partial rewrite, normal RC Room execution
// does not call this route; use /api/dev/agent for the four provider executors.

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDeveloper(user.email)) return NextResponse.json({ error: "Developer access is not enabled for this account" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const explicitSpecialist = body?.specialist === "codex" || body?.specialist === true;
  if (!explicitSpecialist) {
    return NextResponse.json({
      error: "RC Builder is an explicit Codex specialist path. Use /api/ai/chat/stream for Room execution or /api/dev/agent for ChatGPT, Claude, Gemini, and Grok.",
      code: "CODEX_SPECIALIST_EXPLICIT_OPT_IN_REQUIRED",
    }, { status: 409 });
  }

  // Preserve the specialist as analysis-only from this compatibility route.
  // GitHub execution for the four provider system remains exclusively in /api/dev/agent.
  const parsed = chatSchema.safeParse(body);
  const data: BuilderChatData = parsed.success
    ? { roomId: parsed.data.roomId, prompt: parsed.data.prompt, language: parsed.data.language, history: parsed.data.history }
    : { roomId: String(body?.roomId || ""), prompt: String(body?.prompt || ""), language: String(body?.language || "ko"), history: body?.history };
  if (!data.roomId || !data.prompt) return NextResponse.json({ error: "roomId and prompt are required" }, { status: 400 });

  const key = requestKey(data.roomId, data.prompt, data.history);
  const referencedWork = latestWorkFromText(data.prompt, data.history);
  const workId = referencedWork && isContinuationPrompt(data.prompt) ? referencedWork : newWorkId(key);
  const result = await codexJson(`You are the explicit Royal Command Codex specialist. Analyse this request and return JSON only: {"summary":"...","recommendations":["..."]}. Do not claim GitHub execution from this compatibility route.\n\n${data.prompt}`);
  const finalAnswer = `Codex specialist analysis for ${workId}:\n\n${String(result?.summary || "Analysis completed.")}`;
  const evidence = { specialist: "codex", model: CODEX_MODEL, execution: false, recommendations: Array.isArray(result?.recommendations) ? result.recommendations : [] };
  const persisted: BuilderPersistResult = { finalAnswer, workId, revision: 1, evidence, latencyMs: 0 };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.from("messages").insert({ room_id: data.roomId, author_type: "user", content: data.prompt, language: data.language || "ko" });
    await supabase.from("messages").insert({ room_id: data.roomId, author_type: "ai", content: finalAnswer, language: data.language || "ko", metadata: evidence });
  } else {
    localDb.addMessage({ roomId: data.roomId, authorType: "user", content: data.prompt, language: data.language || "ko" });
    localDb.addMessage({ roomId: data.roomId, authorType: "ai", content: finalAnswer, language: data.language || "ko", metadata: evidence });
  }
  logger.info("builder.codex_specialist.completed", { roomId: data.roomId, workId, model: CODEX_MODEL });
  return NextResponse.json(persisted);
}
