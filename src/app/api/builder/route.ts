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
  return prompt.replace(/\s+/g, " ").trim().slice(0, 120) || "Royal Command Builder work";
}

async function github(path: string, init?: RequestInit) {
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
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) throw new Error(data?.message || `GitHub HTTP ${response.status}`);
  return data;
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

async function codexJson(instruction: string, maxOutputTokens = 12_000) {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured for RC Builder");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CODEX_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CODEX_MODEL,
        input: instruction,
        reasoning: { effort: "high" },
        max_output_tokens: maxOutputTokens,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let body: any = {};
    try { body = text ? JSON.parse(text) : {}; }
    catch { throw new Error(`Codex returned non-JSON HTTP ${response.status}`); }
    if (!response.ok) {
      throw new Error(body?.error?.message || `Codex Responses API HTTP ${response.status}`);
    }

    const output = responseText(body);
    if (!output) throw new Error("Codex returned an empty Builder response");
    return parseJsonObject(output);
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Codex Builder timed out after ${Math.round(CODEX_TIMEOUT_MS / 1000)}s`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function updateWork(work: WorkMeta, status: WorkState, patch: { evidence?: Record<string, unknown>; builderModel?: string } = {}) {
  if (!isSupabaseConfigured()) {
    work.status = status;
    if (patch.evidence) work.evidence = patch.evidence;
    return;
  }
  const supabase = await createClient();
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (patch.evidence) update.evidence = patch.evidence;
  if (patch.builderModel) update.builder_model = patch.builderModel;
  const { error } = await supabase
    .from("room_work_records")
    .update(update)
    .eq("room_id", work.roomId)
    .eq("request_key", work.requestKey);
  if (error) logger.warn("builder.work_state_update_failed", { workId: work.workId, status, error: error.message });
  work.status = status;
  if (patch.evidence) work.evidence = patch.evidence;
}

async function resolveWork(roomId: string, prompt: string, history: unknown): Promise<WorkMeta> {
  const key = requestKey(roomId, prompt, history);
  if (!isSupabaseConfigured()) {
    return { workId: newWorkId(key), revision: 1, roomId, requestKey: key, status: "received" };
  }

  const supabase = await createClient();
  const columns = "work_id, revision, status, evidence";
  const { data: existing, error: existingError } = await supabase
    .from("room_work_records")
    .select(columns)
    .eq("room_id", roomId)
    .eq("request_key", key)
    .maybeSingle();
  if (existing) {
    return {
      workId: String(existing.work_id),
      revision: Number(existing.revision || 1),
      roomId,
      requestKey: key,
      status: String(existing.status || "received") as WorkState,
      evidence: existing.evidence && typeof existing.evidence === "object" ? existing.evidence as Record<string, unknown> : {},
    };
  }
  if (existingError) throw new Error(`Work record lookup failed: ${existingError.message}`);

  let workId = newWorkId(key);
  let revision = 1;
  let parentRevision: number | null = null;
  const referencedWork = latestWorkFromText(prompt, history);
  if (referencedWork && isContinuationPrompt(prompt)) {
    const { data: latest } = await supabase
      .from("room_work_records")
      .select("revision")
      .eq("room_id", roomId)
      .eq("work_id", referencedWork)
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) {
      workId = referencedWork;
      parentRevision = Number(latest.revision || 1);
      revision = parentRevision + 1;
    }
  }

  const payload = {
    room_id: roomId,
    request_key: key,
    work_id: workId,
    revision,
    parent_revision: parentRevision,
    title: titleFromPrompt(prompt),
    status: "received",
    builder_model: CODEX_MODEL,
    evidence: {},
  };
  const { data: created, error } = await supabase
    .from("room_work_records")
    .insert(payload)
    .select(columns)
    .single();
  if (created) {
    return { workId: String(created.work_id), revision: Number(created.revision || 1), roomId, requestKey: key, status: "received", evidence: {} };
  }

  if (error?.code === "23505") {
    const { data: winner, error: winnerError } = await supabase
      .from("room_work_records")
      .select(columns)
      .eq("room_id", roomId)
      .eq("request_key", key)
      .single();
    if (winner) {
      return {
        workId: String(winner.work_id),
        revision: Number(winner.revision || 1),
        roomId,
        requestKey: key,
        status: String(winner.status || "received") as WorkState,
        evidence: winner.evidence && typeof winner.evidence === "object" ? winner.evidence as Record<string, unknown> : {},
      };
    }
    throw new Error(`Work record race resolution failed: ${winnerError?.message || error.message}`);
  }
  throw new Error(`Work record creation failed: ${error?.message || "unknown error"}`);
}

function workBranch(work: WorkMeta) {
  const safeWork = work.workId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  return `rc-work/${safeWork}/codex-rev-${String(work.revision).padStart(2, "0")}`;
}

async function ensureWorkBranch(branch: string) {
  try {
    await github(`/git/ref/heads/${encodeURIComponent(branch)}`);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/not found/i.test(message)) throw error;
  }
  const baseRef = await github(`/git/ref/heads/${encodeURIComponent(BASE_BRANCH)}`);
  try {
    await github("/git/refs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/reference already exists/i.test(message)) throw error;
  }
}

async function executeAction(action: BuilderAction, instruction: string, branch: string, work: WorkMeta) {
  const path = String(action.path || "").trim();
  if (!safePath(path)) throw new Error(`Unsafe path rejected: ${path}`);
  if (sensitivePath(path) && !explicitSensitiveInstruction(instruction)) {
    throw new Error(`Sensitive file requires an explicit security/auth instruction: ${path}`);
  }
  const current = await getFile(path, branch);
  const commitMessage = `[${work.workId}][REV-${String(work.revision).padStart(2, "0")}][Codex] ${action.operation} ${path}`;

  if (action.operation === "delete") {
    if (!current.exists) throw new Error(`Cannot delete missing file: ${path}`);
    const result = await github(`/contents/${pathForApi(path)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: commitMessage, sha: current.sha, branch }),
    });
    return { path, operation: action.operation, commit: String(result.commit?.sha || "") };
  }

  const content = String(action.content || "");
  if (!content.trim()) throw new Error(`Empty content rejected: ${path}`);
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new Error(`File too large: ${path}`);
  if (action.operation === "create" && current.exists) throw new Error(`File already exists: ${path}`);
  if (action.operation === "update" && !current.exists) throw new Error(`File does not exist: ${path}`);

  const body: Record<string, unknown> = {
    message: commitMessage,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch,
  };
  if (current.exists) body.sha = current.sha;
  const result = await github(`/contents/${pathForApi(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { path, operation: action.operation, commit: String(result.commit?.sha || "") };
}

async function createPullRequest(work: WorkMeta, branch: string, commits: Array<{ path: string; operation: string; commit: string }>) {
  const title = `[${work.workId}][REV-${String(work.revision).padStart(2, "0")}][Codex] Royal Command Builder work`;
  const body = [
    `Work ID: ${work.workId}`,
    `Revision: ${work.revision}`,
    `Builder: Codex (${CODEX_MODEL})`,
    `Branch: ${branch}`,
    "",
    "Verified changes:",
    ...commits.map((item) => `- ${item.operation}: ${item.path} — ${item.commit}`),
    "",
    "Production merge requires user approval.",
  ].join("\n");
  try {
    const pr = await github("/pulls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, head: branch, base: BASE_BRANCH, body }),
    });
    return { number: pr.number || null, url: pr.html_url || "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/pull request.*already exists|validation failed/i.test(message)) {
      const prs = await github(`/pulls?head=${encodeURIComponent(REPO.split("/")[0] + ":" + branch)}&base=${encodeURIComponent(BASE_BRANCH)}&state=open`);
      const first = Array.isArray(prs) ? prs[0] : null;
      if (first) return { number: first.number || null, url: first.html_url || "" };
    }
    throw error;
  }
}

async function persistMessages(user: Awaited<ReturnType<typeof getCurrentUser>>, data: any, result: any) {
  if (!user) return result;
  const language = data.language || user.defaultLanguage;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: userMsg } = await supabase
      .from("messages")
      .insert({ room_id: data.roomId, author_id: user.id, author_type: "user", content: data.prompt, language })
      .select("*")
      .single();
    const { data: aiMsg } = await supabase
      .from("messages")
      .insert({
        room_id: data.roomId,
        author_type: "ai",
        content: result.finalAnswer,
        language,
        metadata: {
          builderExecution: true,
          workId: result.workId,
          revision: result.revision,
          builderModel: CODEX_MODEL,
          evidence: result.evidence,
        },
      })
      .select("*")
      .single();
    await supabase.from("ai_runs").insert({
      room_id: data.roomId,
      message_id: aiMsg?.id,
      prompt: data.prompt,
      providers: ["codex"],
      responses: [],
      final_answer: result.finalAnswer,
      comparison: { builder: "codex", workId: result.workId, revision: result.revision, evidence: result.evidence },
      status: "completed",
      latency_ms: result.latencyMs,
      created_by: user.id,
    });
    return { ...result, userMessage: userMsg, aiMessage: aiMsg };
  }

  const userMessage = localDb.addMessage({ roomId: data.roomId, authorType: "user", content: data.prompt, language });
  const aiMessage = localDb.addMessage({
    roomId: data.roomId,
    authorType: "ai",
    content: result.finalAnswer,
    language,
    metadata: { builderExecution: true, workId: result.workId, revision: result.revision, builderModel: CODEX_MODEL, evidence: result.evidence },
  });
  return { ...result, userMessage, aiMessage };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    authenticated: true,
    developer: isDeveloper(user.email),
    builder: "codex",
    model: CODEX_MODEL,
    codexConfigured: Boolean(process.env.OPENAI_API_KEY),
    githubConfigured: Boolean(process.env.GITHUB_TOKEN),
    executionPolicy: "Codex plan first; Work-ID branch only; PR required; no direct master write",
  });
}

export async function POST(request: Request) {
  const started = Date.now();
  let work: WorkMeta | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isDeveloper(user.email)) return NextResponse.json({ error: "Builder access is not enabled for this account" }, { status: 403 });

    const body = await request.json();
    const data = chatSchema.parse(body);
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Codex Builder is not configured" }, { status: 503 });
    if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: "GitHub Builder execution is not configured" }, { status: 503 });

    work = await resolveWork(data.roomId, data.prompt, data.history);
    if (["planning", "tools_running", "awaiting_evidence"].includes(work.status)) {
      return NextResponse.json({ error: "This exact Builder work is already running", workId: work.workId, revision: work.revision }, { status: 409 });
    }
    if (["reportable", "awaiting_user_approval", "approved", "done"].includes(work.status) && work.evidence && Object.keys(work.evidence).length) {
      return NextResponse.json({
        blocked: false,
        builderExecution: true,
        workId: work.workId,
        revision: work.revision,
        evidence: work.evidence,
        finalAnswer: `**Work ID:** ${work.workId} | **Revision:** ${work.revision}\n\n이 작업은 이미 실행 증거가 기록되어 있습니다. 중복 실행하지 않았습니다.`,
        latencyMs: Date.now() - started,
      });
    }

    await updateWork(work, "planning", { builderModel: CODEX_MODEL });

    const tree = await github(`/git/trees/${encodeURIComponent(BASE_BRANCH)}?recursive=1`);
    const paths = (tree.tree || [])
      .filter((entry: { type?: string; path?: string; size?: number }) => entry.type === "blob" && entry.path && safePath(entry.path) && (entry.size || 0) <= MAX_FILE_BYTES)
      .map((entry: { path: string }) => entry.path)
      .slice(0, 1800);

    const selection = await codexJson([
      "You are Codex operating as the Royal Command Chief Builder.",
      "Select only the repository files needed to execute the user's current development order safely.",
      `Return strict JSON only: {\"readPaths\":[\"src/...\"],\"newPaths\":[\"src/...\"],\"reason\":\"short Korean explanation\"}. Maximum ${MAX_FILES} total paths.`,
      "Never select .env, secrets, credentials, certificates, private keys, or lockfiles.",
      "Do not make any code changes in this step.",
      "",
      `Work ID: ${work.workId}`,
      `Revision: ${work.revision}`,
      "USER ORDER:",
      data.prompt,
      "",
      "REPOSITORY FILES:",
      paths.join("\n"),
    ].join("\n"), 4_000);

    const readPaths = Array.isArray(selection.readPaths)
      ? selection.readPaths.filter((p: unknown) => typeof p === "string" && safePath(p as string)).slice(0, MAX_FILES)
      : [];
    const newPaths = Array.isArray(selection.newPaths)
      ? selection.newPaths.filter((p: unknown) => typeof p === "string" && safePath(p as string)).slice(0, MAX_FILES)
      : [];
    const relevantPaths = Array.from(new Set([...readPaths, ...newPaths])).slice(0, MAX_FILES);
    if (!relevantPaths.length) throw new Error("Codex did not select any safe repository files for this Builder order");

    const sourceSections: string[] = [];
    for (const path of relevantPaths) {
      const file = await getFile(path, BASE_BRANCH);
      sourceSections.push(file.exists
        ? `--- ${path} ---\n${file.content.slice(0, MAX_READ_CHARS_PER_FILE)}`
        : `--- ${path} ---\nDOES NOT EXIST`);
    }

    const generated = await codexJson([
      "You are Codex operating as the Royal Command Chief Builder.",
      "Produce the complete minimal safe code change for the user's current order in ONE response.",
      `Return strict JSON only: {\"summary\":\"short Korean summary\",\"actions\":[{\"path\":\"src/...\",\"operation\":\"create|update|delete\",\"reason\":\"short reason\",\"contentBase64\":\"BASE64_UTF8_COMPLETE_FILE\"}]}. Maximum ${MAX_FILES} actions.`,
      "For create/update, contentBase64 MUST contain the complete final UTF-8 file. For delete, omit contentBase64.",
      "Preserve unrelated existing behavior. Never expose or create secrets. Never modify lockfiles.",
      "Do not claim GitHub execution; the host will execute only after your full plan is validated.",
      "",
      `Work ID: ${work.workId}`,
      `Revision: ${work.revision}`,
      "USER ORDER:",
      data.prompt,
      "",
      "RELEVANT CURRENT FILES:",
      sourceSections.join("\n\n"),
    ].join("\n"), 16_000);

    const rawActions = Array.isArray(generated.actions) ? generated.actions.slice(0, MAX_FILES) : [];
    const actions: BuilderAction[] = rawActions.map((item: any) => {
      const path = String(item?.path || "").trim();
      const operation: BuilderAction["operation"] = item?.operation === "create" || item?.operation === "delete" ? item.operation : "update";
      if (!safePath(path)) throw new Error(`Unsafe Codex path rejected: ${path}`);
      if (sensitivePath(path) && !explicitSensitiveInstruction(data.prompt)) throw new Error(`Sensitive file requires explicit security/auth instruction: ${path}`);
      if (operation === "delete") return { path, operation, reason: typeof item?.reason === "string" ? item.reason : undefined };
      const encoded = typeof item?.contentBase64 === "string" ? item.contentBase64.trim() : "";
      if (!encoded) throw new Error(`Codex returned no complete file content for ${path}`);
      const content = Buffer.from(encoded, "base64").toString("utf8");
      if (!content.trim()) throw new Error(`Decoded Codex file is empty: ${path}`);
      if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new Error(`Codex generated file too large: ${path}`);
      return { path, operation, reason: typeof item?.reason === "string" ? item.reason : undefined, content };
    });
    if (!actions.length) throw new Error("Codex did not produce any safe executable actions");

    await updateWork(work, "tools_running", { builderModel: CODEX_MODEL });
    const branch = workBranch(work);
    await ensureWorkBranch(branch);
    const commits: Array<{ path: string; operation: string; commit: string }> = [];
    for (const action of actions) commits.push(await executeAction(action, data.prompt, branch, work));

    await updateWork(work, "awaiting_evidence", { builderModel: CODEX_MODEL });
    const pr = await createPullRequest(work, branch, commits);
    const evidence = {
      model: CODEX_MODEL,
      branch,
      commits,
      pr,
      files: actions.map((action) => ({ path: action.path, operation: action.operation })),
      verifiedAt: new Date().toISOString(),
    };
    const evidenceVerified = commits.length > 0 && commits.every((item) => Boolean(item.commit)) && Boolean(pr.number || pr.url);
    if (!evidenceVerified) throw new Error("Builder execution finished without complete GitHub evidence");

    await updateWork(work, "reportable", { evidence, builderModel: CODEX_MODEL });
    const changed = actions.map((action) => `${action.operation}: ${action.path}`);
    const finalAnswer = [
      `**Work ID:** ${work.workId} | **Revision:** ${work.revision}`,
      "",
      "### RC Builder — Codex 실행 완료",
      `Model: ${CODEX_MODEL}`,
      "Status: CODE_CHANGED_ON_SAFE_BRANCH",
      "",
      String(generated.summary || selection.reason || "Codex가 최소 변경안을 생성하고 실행했습니다."),
      "",
      "작업 파일:",
      ...changed.map((item) => `- ${item}`),
      "",
      `Branch: ${branch}`,
      ...commits.map((item) => `Commit: ${item.commit}`),
      `PR: ${pr.number ? `#${pr.number}` : ""}${pr.url ? ` — ${pr.url}` : ""}`,
      "",
      "Production에는 아직 merge하지 않았습니다. 검증 후 승인 단계에서 반영합니다.",
    ].join("\n");

    const result = {
      blocked: false,
      builderExecution: true,
      providers: ["codex"],
      responses: [],
      workId: work.workId,
      revision: work.revision,
      evidence,
      evidenceVerified,
      finalAnswer,
      comparison: { winners: ["codex"], notes: ["Dedicated RC Builder path; no Council and no generic AI development fallback."], providerScores: { codex: 1 } },
      latencyMs: Date.now() - started,
    };
    const persisted = await persistMessages(user, data, result);
    logger.info("builder.completed", { workId: work.workId, revision: work.revision, model: CODEX_MODEL, branch, pr: pr.number, latencyMs: result.latencyMs });
    return NextResponse.json(persisted);
  } catch (error) {
    const message = error instanceof Error ? error.message : "RC Builder failed";
    if (work) await updateWork(work, "failed", { builderModel: CODEX_MODEL, evidence: { ...(work.evidence || {}), error: message, failedAt: new Date().toISOString() } });
    logger.error("builder.failed", { workId: work?.workId, revision: work?.revision, model: CODEX_MODEL, error: message });
    return NextResponse.json({ error: message, workId: work?.workId, revision: work?.revision, builder: "codex", model: CODEX_MODEL }, { status: 500 });
  }
}
