import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseJsonObject } from "@/lib/ai/devAgentCodec";
import { decodeDeveloperFilePayload } from "@/lib/ai/devAgentContent";
import { getConnector } from "@/lib/ai/connectors";
import type { AIProviderId } from "@/lib/ai/types";

const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BASE_BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const MAX_FILES = 6;
const MAX_FILE_BYTES = 180_000;
const OWNER_DEV_EMAILS = ["harry2park@gmail.com", "harry@royalcommand.ai"];
const DEV_PROVIDERS = ["openai", "anthropic", "google", "xai"] as const;
type DevProvider = (typeof DEV_PROVIDERS)[number];

const PROVIDER_NAMES: Record<DevProvider, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
};

type DevAction = {
  path: string;
  operation: "create" | "update" | "delete";
  content?: string;
  reason?: string;
};

type PlannedAction = {
  path: string;
  operation: "create" | "update" | "delete";
  reason?: string;
};

type WorkMeta = {
  workId: string;
  revision: number;
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

function parseProvider(value: unknown): DevProvider | null {
  const provider = String(value || "").trim().toLowerCase();
  return (DEV_PROVIDERS as readonly string[]).includes(provider) ? (provider as DevProvider) : null;
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

function parseWorkMeta(instruction: string): WorkMeta {
  const workIdMatch = instruction.match(/Work ID:\s*(RC-[A-Z0-9-]+)/i);
  const revisionMatch = instruction.match(/Revision:\s*(\d+)/i);
  if (!workIdMatch) throw new Error("Host-verified Work ID is required before code execution");
  return {
    workId: workIdMatch[1].toUpperCase(),
    revision: Math.max(1, Number(revisionMatch?.[1] || 1)),
  };
}

function workBranch(meta: WorkMeta, provider: DevProvider) {
  const safeWork = meta.workId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  return `rc-work/${safeWork}/${provider}-rev-${String(meta.revision).padStart(2, "0")}`;
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

async function developerModel(provider: DevProvider, prompt: string) {
  const connector = getConnector(provider as AIProviderId);
  if (!connector.isConfigured()) {
    throw new Error(`${PROVIDER_NAMES[provider]} API is not configured`);
  }

  const response = await connector.complete({
    messages: [
      {
        role: "system",
        content: `You are ${PROVIDER_NAMES[provider]} operating as a Royal Command senior autonomous developer. Return strict JSON only. When returning a complete source file, use exactly one of: contentBase64 containing valid Base64-encoded UTF-8 source, or content containing the complete UTF-8 source text. Never return placeholders, empty file content, markdown fences, secrets, or credentials.`,
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.05,
    maxTokens: 16000,
  });

  if (response.error) throw new Error(response.error);
  if (!response.content?.trim()) throw new Error(`${PROVIDER_NAMES[provider]} returned an empty developer response`);
  return parseJsonObject(response.content);
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

async function executeAction(
  action: DevAction,
  instruction: string,
  provider: DevProvider,
  branch: string,
  meta: WorkMeta,
) {
  const path = String(action.path || "").trim();
  if (!safePath(path)) throw new Error(`Unsafe path rejected: ${path}`);
  if (sensitivePath(path) && !explicitSensitiveInstruction(instruction)) {
    throw new Error(`Sensitive file requires an explicit security/auth instruction: ${path}`);
  }

  const current = await getFile(path, branch);
  const commitMessage = `[${meta.workId}][REV-${String(meta.revision).padStart(2, "0")}][${PROVIDER_NAMES[provider]}] ${action.operation} ${path}`;

  if (action.operation === "delete") {
    if (!current.exists) throw new Error(`Cannot delete missing file: ${path}`);
    const result = await github(`/contents/${pathForApi(path)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: commitMessage, sha: current.sha, branch }),
    });
    return { path, operation: action.operation, commit: result.commit?.sha || "" };
  }

  const content = String(action.content || "");
  if (!content) throw new Error(`Empty content rejected: ${path}`);
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
  return { path, operation: action.operation, commit: result.commit?.sha || "" };
}

async function createPullRequest(meta: WorkMeta, provider: DevProvider, branch: string, commits: Array<{ path: string; operation: string; commit: string }>) {
  const title = `[${meta.workId}][REV-${String(meta.revision).padStart(2, "0")}][${PROVIDER_NAMES[provider]}] Royal Command work`;
  const body = [
    `Work ID: ${meta.workId}`,
    `Revision: ${meta.revision}`,
    `AI: ${PROVIDER_NAMES[provider]}`,
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
      return { number: null, url: "", warning: message };
    }
    throw error;
  }
}

async function generateOneAction(plan: PlannedAction, instruction: string, provider: DevProvider): Promise<DevAction> {
  if (plan.operation === "delete") return { ...plan };

  const current = await getFile(plan.path, BASE_BRANCH);
  const currentBlock = current.exists
    ? `CURRENT FILE (${plan.path}):\n${current.content}`
    : `CURRENT FILE (${plan.path}): DOES NOT EXIST`;
  let lastError = "unknown generation failure";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryInstruction = attempt === 1
      ? ""
      : `\n\nRETRY REQUIREMENT:\nThe previous generated payload was invalid (${lastError}). Return the COMPLETE file again. Do not return an empty string, placeholder, explanation, markdown fence, or truncated pseudo-content.`;
    const result = await developerModel(provider, `Create exactly ONE complete file for the approved Royal Command change. Return strict JSON using exactly one valid source field: {"contentBase64":"VALID_BASE64_OF_COMPLETE_UTF8_FILE"} OR {"content":"COMPLETE_UTF8_SOURCE_TEXT"}. Do not return both fields. No markdown. Never return a placeholder or empty content.${retryInstruction}\n\nUSER INSTRUCTION:\n${instruction}\n\nTARGET:\npath=${plan.path}\noperation=${plan.operation}\nreason=${plan.reason || ""}\n\n${currentBlock}`);

    try {
      const decoded = decodeDeveloperFilePayload(result, plan.path, MAX_FILE_BYTES);
      return { ...plan, content: decoded.content };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`${PROVIDER_NAMES[provider]} could not generate a valid complete source file for ${plan.path} after 2 attempts: ${lastError}`);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    authenticated: true,
    developer: isDeveloper(user.email),
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      google: Boolean(process.env.GOOGLE_AI_API_KEY || process.env.OPENROUTER_API_KEY),
      xai: Boolean(process.env.XAI_API_KEY),
    },
    githubConfigured: Boolean(process.env.GITHUB_TOKEN),
    developerAccessConfigured: developerEmails().length > 0,
    repo: REPO,
    branch: BASE_BRANCH,
    executionPolicy: "work-id branch only; PR required; no direct master write",
  });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isDeveloper(user.email)) return NextResponse.json({ error: "Developer access is not enabled for this account" }, { status: 403 });

    const body = await request.json();
    const provider = parseProvider(body?.provider);
    const instruction = String(body?.instruction || "").trim();
    const execute = body?.execute === true;
    const proposed = Array.isArray(body?.actions) ? body.actions : Array.isArray(body?.files) ? body.files : null;

    if (!provider) return NextResponse.json({ error: "Developer provider must be openai, anthropic, google, or xai" }, { status: 400 });
    if (!instruction) return NextResponse.json({ error: "Instruction is required" }, { status: 400 });

    if (execute) {
      if (!proposed?.length) return NextResponse.json({ error: "No approved actions supplied" }, { status: 400 });
      const meta = parseWorkMeta(instruction);
      const branch = workBranch(meta, provider);
      await ensureWorkBranch(branch);

      const actions: DevAction[] = proposed.slice(0, MAX_FILES).map((item: any) => ({
        path: String(item.path || ""),
        operation: item.operation === "create" || item.operation === "delete" ? item.operation : "update",
        content: typeof item.content === "string" ? item.content : undefined,
        reason: typeof item.reason === "string" ? item.reason : undefined,
      }));
      const commits: Array<{ path: string; operation: "create" | "update" | "delete"; commit: string }> = [];
      for (const action of actions) commits.push(await executeAction(action, instruction, provider, branch, meta));
      const pr = await createPullRequest(meta, provider, branch, commits);

      return NextResponse.json({
        ok: true,
        executed: true,
        provider,
        workId: meta.workId,
        revision: meta.revision,
        branch,
        commits,
        pr,
        evidenceVerified: commits.length > 0 && commits.every((item) => Boolean(item.commit)),
      });
    }

    const tree = await github(`/git/trees/${encodeURIComponent(BASE_BRANCH)}?recursive=1`);
    const paths = (tree.tree || [])
      .filter((entry: { type?: string; path?: string; size?: number }) => entry.type === "blob" && entry.path && safePath(entry.path) && (entry.size || 0) <= MAX_FILE_BYTES)
      .map((entry: { path: string }) => entry.path)
      .slice(0, 1800);

    const selection = await developerModel(provider, `Select only the repository files needed for this Royal Command change. Return JSON only: {"readPaths":["src/..."],"newPaths":["src/..."],"reason":"short Korean explanation"}. Maximum ${MAX_FILES}. Never select secrets, .env, credentials, certificates, private keys, or lockfiles.\n\nUSER INSTRUCTION:\n${instruction}\n\nREPOSITORY FILES:\n${paths.join("\n")}`);

    const readPaths = Array.isArray(selection.readPaths) ? selection.readPaths.filter((p: unknown) => typeof p === "string" && safePath(p)).slice(0, MAX_FILES) : [];
    const newPaths = Array.isArray(selection.newPaths) ? selection.newPaths.filter((p: unknown) => typeof p === "string" && safePath(p)).slice(0, MAX_FILES) : [];

    const summaries = [];
    for (const path of readPaths) {
      const file = await getFile(path, BASE_BRANCH);
      if (file.exists) summaries.push(`--- ${path} ---\n${file.content.slice(0, 30000)}`);
    }

    const planResult = await developerModel(provider, `Plan the minimal safe file operations for this Royal Command change. DO NOT return file contents. Return JSON only: {"summary":"short Korean summary","actions":[{"path":"src/...","operation":"create|update|delete","reason":"short reason"}]}. Maximum ${MAX_FILES} actions. Preserve existing features.\n\nUSER INSTRUCTION:\n${instruction}\n\nPOSSIBLE NEW FILES:\n${newPaths.join("\n")}\n\nRELEVANT CURRENT FILES:\n${summaries.join("\n\n")}`);

    const planned: PlannedAction[] = Array.isArray(planResult.actions)
      ? planResult.actions
          .map((item: any) => ({
            path: String(item.path || ""),
            operation: item.operation === "create" || item.operation === "delete" ? item.operation : "update",
            reason: typeof item.reason === "string" ? item.reason : undefined,
          }))
          .filter((item: PlannedAction) => safePath(item.path))
          .filter((item: PlannedAction) => !sensitivePath(item.path) || explicitSensitiveInstruction(instruction))
          .slice(0, MAX_FILES)
      : [];

    if (!planned.length) return NextResponse.json({ error: `${PROVIDER_NAMES[provider]} could not produce a safe executable change plan`, selection, planResult }, { status: 422 });

    const actions: DevAction[] = [];
    for (const plan of planned) actions.push(await generateOneAction(plan, instruction, provider));

    return NextResponse.json({
      ok: true,
      executed: false,
      provider,
      summary: planResult.summary || selection.reason || "",
      actions,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Development agent failed" }, { status: 500 });
  }
}
