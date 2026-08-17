import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { auditToolGateway, evaluateToolPermission } from "@/lib/tool-gateway";

const OWNER_EMAILS = new Set(["harry2park@gmail.com", "harry@royalcommand.ai"]);
const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BASE_BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_cJAYeuQdkm2FB2ZbEQc7YkRUUP6L";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "team_NWm2Okr8KmL9qfDAtabL6ObO";
const VERCEL_PROJECT_NAME = process.env.VERCEL_PROJECT_NAME || "royal-command-ai";

function owner(email: string) { return OWNER_EMAILS.has(email.trim().toLowerCase()); }
function safePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("..")) return false;
  if (/^\.git\//i.test(path)) return false;
  if (/(^|\/)(\.env|secrets?|credentials?)(\/|$)/i.test(path)) return false;
  if (/\.(pem|key|p12|pfx|crt)$/i.test(path)) return false;
  return true;
}

async function github(path: string, init?: RequestInit) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GitHub host credential is not configured");
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data?.message || `GitHub HTTP ${res.status}`);
  return data;
}

async function vercel(path: string, init?: RequestInit) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("Vercel host credential is not configured");
  const join = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://api.vercel.com${path}${join}teamId=${encodeURIComponent(VERCEL_TEAM_ID)}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
  if (!res.ok) throw new Error(data?.error?.message || data?.message || `Vercel HTTP ${res.status}`);
  return data;
}

async function latestProductionDeployment() {
  const data = await vercel(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_PROJECT_ID)}&target=production&limit=1`);
  return Array.isArray(data?.deployments) ? data.deployments[0] || null : null;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const capability = String(body?.capability || "").trim();
    const action = String(body?.action || "").trim();
    const approved = body?.approved === true;
    const decision = evaluateToolPermission(capability, { owner: owner(user.email), approved });
    if (decision.decision !== "allow") return NextResponse.json({ ok: false, ...decision }, { status: decision.decision === "approval_required" ? 409 : 403 });

    let result: unknown;
    if (capability === "github.repo.read" && action === "tree") {
      const tree = await github(`/git/trees/${encodeURIComponent(BASE_BRANCH)}?recursive=1`);
      result = (tree.tree || []).filter((item: any) => item.type === "blob" && safePath(String(item.path || ""))).slice(0, 500).map((item: any) => ({ path: item.path, size: item.size, sha: item.sha }));
    } else if (capability === "github.repo.read" && action === "file") {
      const path = String(body?.path || "").trim();
      if (!safePath(path)) return NextResponse.json({ error: "Unsafe path" }, { status: 400 });
      const file = await github(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(BASE_BRANCH)}`);
      result = { path, sha: file.sha, content: Buffer.from(file.content || "", "base64").toString("utf8") };
    } else if (capability === "github.file.write" && (action === "create" || action === "update")) {
      const path = String(body?.path || "").trim();
      const content = String(body?.content || "");
      if (!safePath(path) || !content) return NextResponse.json({ error: "Safe path and content are required" }, { status: 400 });
      const suffix = Date.now().toString(36);
      const branch = `gateway/${suffix}`;
      const ref = await github(`/git/ref/heads/${encodeURIComponent(BASE_BRANCH)}`);
      await github("/git/refs", { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }) });
      let current: any = null;
      try { current = await github(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`); } catch {}
      if (action === "create" && current) return NextResponse.json({ error: "File already exists" }, { status: 409 });
      if (action === "update" && !current) return NextResponse.json({ error: "File does not exist" }, { status: 404 });
      const payload: Record<string, unknown> = { message: `Tool Gateway: ${action} ${path}`, content: Buffer.from(content, "utf8").toString("base64"), branch };
      if (current?.sha) payload.sha = current.sha;
      const saved = await github(`/contents/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "PUT", body: JSON.stringify(payload) });
      result = { branch, path, commit: saved.commit?.sha || "" };
    } else if (capability === "vercel.runtime.read" && action === "latest") {
      result = await latestProductionDeployment();
    } else if (capability === "vercel.runtime.read" && action === "build_logs") {
      const deployment = String(body?.deploymentId || "").trim() || String((await latestProductionDeployment())?.uid || "");
      if (!deployment) return NextResponse.json({ error: "No production deployment found" }, { status: 404 });
      result = await vercel(`/v3/deployments/${encodeURIComponent(deployment)}/events?limit=100&direction=backward`);
    } else if (capability === "vercel.runtime.read" && action === "runtime_logs") {
      const deployment = String(body?.deploymentId || "").trim() || String((await latestProductionDeployment())?.uid || "");
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
