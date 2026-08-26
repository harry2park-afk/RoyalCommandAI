import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DEV_PROVIDER_IDS, DEV_PROVIDER_NAMES } from "@/lib/ai/executionRouting";
import type { AIProviderId } from "@/lib/ai/types";
import { auditToolGateway, evaluateToolPermission } from "@/lib/tool-gateway";

const OWNER_EMAILS = new Set(["harry2park@gmail.com", "harry@royalcommand.ai"]);
const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BASE_BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_cJAYeuQdkm2FB2ZbEQc7YkRUUP6L";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "team_NWm2Okr8KmL9qfDAtabL6ObO";
const VERCEL_PROJECT_NAME = process.env.VERCEL_PROJECT_NAME || "royal-command-ai";

type JsonObject = Record<string, unknown>;

function owner(email: string) { return OWNER_EMAILS.has(email.trim().toLowerCase()); }
function safePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("..")) return false;
  if (/^\.git\//i.test(path)) return false;
  if (/(^|\/)(\.env|secrets?|credentials?)(\/|$)/i.test(path)) return false;
  if (/\.(pem|key|p12|pfx|crt)$/i.test(path)) return false;
  return true;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function parseProvider(value: unknown): AIProviderId | null {
  const provider = String(value || "").trim().toLowerCase() as AIProviderId;
  return DEV_PROVIDER_IDS.includes(provider as (typeof DEV_PROVIDER_IDS)[number]) ? provider : null;
}

function parseWorkMeta(body: JsonObject) {
  const workId = String(body.workId || body.work_id || "").trim().toUpperCase();
  const revision = Math.max(1, Number(body.revision || 1));
  const provider = parseProvider(body.provider);
  if (!/^RC-\d{8}(?:-[A-Z0-9]+)+$/.test(workId)) throw new Error("Host-verified Work ID is required for GitHub writes");
  if (!provider) throw new Error("Provider must be openai, anthropic, google, or xai for GitHub writes");
  return { workId, revision, provider };
}

function workBranch(workId: string, revision: number, provider: AIProviderId) {
  const safeWork = workId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  return `rc-work/${safeWork}/${provider}-gateway-rev-${String(revision).padStart(2, "0")}`;
}

async function github(path: string, init?: RequestInit): Promise<JsonObject> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GitHub host credential is not configured");
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  const object = asObject(data);
  if (!res.ok) throw new Error(String(object.message || `GitHub HTTP ${res.status}`));
  return object;
}

async function ensureBranch(branch: string) {
  try {
    await github(`/git/ref/heads/${encodeURIComponent(branch)}`);
    return;
  } catch (error) {
    if (!/not found/i.test(error instanceof Error ? error.message : String(error))) throw error;
  }
  const base = await github(`/git/ref/heads/${encodeURIComponent(BASE_BRANCH)}`);
  const baseObject = asObject(base.object);
  await github("/git/refs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: String(baseObject.sha || "") }),
  });
}

async function findOpenPullRequest(branch: string) {
  const ownerName = REPO.split("/")[0];
  const data = await github(`/pulls?head=${encodeURIComponent(`${ownerName}:${branch}`)}&base=${encodeURIComponent(BASE_BRANCH)}&state=open`);
  const items = Array.isArray(data.items) ? data.items : [];
  return items.length ? asObject(items[0]) : null;
}

async function vercel(path: string, init?: RequestInit): Promise<JsonObject> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("Vercel host credential is not configured");
  const join = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://api.vercel.com${path}${join}teamId=${encodeURIComponent(VERCEL_TEAM_ID)}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
  const object = asObject(data);
  if (!res.ok) {
    const error = asObject(object.error);
    throw new Error(String(error.message || object.message || `Vercel HTTP ${res.status}`));
  }
  return object;
}

async function latestProductionDeployment() {
  const data = await vercel(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_PROJECT_ID)}&target=production&limit=1`);
  return Array.isArray(data.deployments) ? data.deployments[0] || null : null;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = asObject(await request.json().catch(() => ({})));
    const capability = String(body.capability || "").trim();
    const action = String(body.action || "").trim();
    const approved = body.approved === true;
    const decision = evaluateToolPermission(capability, { owner: owner(user.email), approved });
    if (decision.decision !== "allow") return NextResponse.json({ ok: false, ...decision }, { status: decision.decision === "approval_required" ? 409 : 403 });

    let result: unknown;
    if (capability === "github.repo.read" && action === "tree") {
      const tree = await github(`/git/trees/${encodeURIComponent(BASE_BRANCH)}?recursive=1`);
      result = (Array.isArray(tree.tree) ? tree.tree : [])
        .map(asObject)
        .filter((item) => item.type === "blob" && safePath(String(item.path || "")))
        .slice(0, 500)
        .map((item) => ({ path: item.path, size: item.size, sha: item.sha }));
    } else if (capability === "github.repo.read" && action === "file") {
      const path = String(body.path || "").trim();
      if (!safePath(path)) return NextResponse.json({ error: "Unsafe path" }, { status: 400 });
      const file = await github(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(BASE_BRANCH)}`);
      result = { path, sha: file.sha, content: Buffer.from(String(file.content || ""), "base64").toString("utf8") };
    } else if (capability === "github.file.write" && (action === "create" || action === "update")) {
      const path = String(body.path || "").trim();
      const content = String(body.content || "");
      if (!safePath(path) || !content) return NextResponse.json({ error: "Safe path and content are required" }, { status: 400 });

      const meta = parseWorkMeta(body);
      const branch = workBranch(meta.workId, meta.revision, meta.provider);
      await ensureBranch(branch);
      let current: JsonObject | null = null;
      try { current = await github(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`); } catch {}
      if (action === "create" && current) return NextResponse.json({ error: "File already exists" }, { status: 409 });
      if (action === "update" && !current) return NextResponse.json({ error: "File does not exist" }, { status: 404 });

      const providerName = DEV_PROVIDER_NAMES[meta.provider] || meta.provider;
      const payload: Record<string, unknown> = {
        message: `[${meta.workId}][REV-${String(meta.revision).padStart(2, "0")}][${providerName}] gateway ${action} ${path}`,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
      };
      if (current?.sha) payload.sha = current.sha;
      const saved = await github(`/contents/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const commit = asObject(saved.commit);
      const existingPr = await findOpenPullRequest(branch).catch(() => null);
      result = {
        workId: meta.workId,
        revision: meta.revision,
        provider: meta.provider,
        providerName,
        branch,
        path,
        commit: String(commit.sha || ""),
        pr: existingPr ? { number: existingPr.number || null, url: existingPr.html_url || "" } : null,
        prAutomation: "RC Work PR workflow creates/reuses the provider PR after rc-work push; no direct master write",
      };
    } else if (capability === "vercel.runtime.read" && action === "latest") {
      result = await latestProductionDeployment();
    } else if (capability === "vercel.runtime.read" && action === "build_logs") {
      const latest = asObject(await latestProductionDeployment());
      const deployment = String(body.deploymentId || latest.uid || "").trim();
      if (!deployment) return NextResponse.json({ error: "No production deployment found" }, { status: 404 });
      result = await vercel(`/v3/deployments/${encodeURIComponent(deployment)}/events?limit=100&direction=backward`);
    } else if (capability === "vercel.runtime.read" && action === "runtime_logs") {
      const latest = asObject(await latestProductionDeployment());
      const deployment = String(body.deploymentId || latest.uid || "").trim();
      if (!deployment) return NextResponse.json({ error: "No production deployment found" }, { status: 404 });
      result = await vercel(`/v1/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/deployments/${encodeURIComponent(deployment)}/runtime-logs`);
    } else if (capability === "vercel.deploy" && action === "production") {
      result = await vercel("/v13/deployments?forceNew=1", { method: "POST", body: JSON.stringify({ name: VERCEL_PROJECT_NAME, project: VERCEL_PROJECT_ID, target: "production", gitSource: { type: "github", org: "harry2park-afk", repo: "RoyalCommandAI", ref: BASE_BRANCH } }) });
    } else {
      return NextResponse.json({ error: "Unsupported gateway action" }, { status: 400 });
    }

    auditToolGateway("execute", { userId: user.id, capability, action, approved, ok: true });
    return NextResponse.json({ ok: true, capability, action, result });
  } catch (error) {
    auditToolGateway("execute_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tool Gateway execution failed" }, { status: 500 });
  }
}
