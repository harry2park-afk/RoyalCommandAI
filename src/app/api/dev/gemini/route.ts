import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const GOOGLE_MODEL = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash";
const MAX_FILES = 4;

function isDeveloper(email: string) {
  const allowed = (process.env.ROYAL_COMMAND_DEV_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

async function github(path: string, init?: RequestInit) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `GitHub HTTP ${res.status}`);
  return data;
}

async function gemini(prompt: string) {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not configured");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8000, responseMimeType: "application/json" },
      }),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "{}";
  return JSON.parse(text);
}

function safePath(path: string) {
  return path.startsWith("src/") && !path.includes("..") && !/middleware|auth|secret|env/i.test(path);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isDeveloper(user.email)) return NextResponse.json({ error: "Developer access is not enabled for this account" }, { status: 403 });

    const body = await request.json();
    const instruction = String(body?.instruction || "").trim();
    const execute = body?.execute === true;
    const proposed = Array.isArray(body?.files) ? body.files : null;
    if (!instruction) return NextResponse.json({ error: "Instruction is required" }, { status: 400 });

    if (execute) {
      if (!proposed?.length) return NextResponse.json({ error: "No approved files supplied" }, { status: 400 });
      const files = proposed.slice(0, MAX_FILES);
      const commits: Array<{ path: string; commit: string }> = [];
      for (const file of files) {
        const path = String(file.path || "");
        const content = String(file.content || "");
        if (!safePath(path) || !content) throw new Error(`Unsafe or empty file: ${path}`);
        const current = await github(`/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(BRANCH)}`);
        const update = await github(`/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Gemini dev agent: ${instruction.slice(0, 72)}`,
            content: Buffer.from(content, "utf8").toString("base64"),
            sha: current.sha,
            branch: BRANCH,
          }),
        });
        commits.push({ path, commit: update.commit?.sha || "" });
      }
      return NextResponse.json({ ok: true, executed: true, commits });
    }

    const tree = await github(`/git/trees/${encodeURIComponent(BRANCH)}?recursive=1`);
    const paths = (tree.tree || [])
      .filter((x: { type?: string; path?: string }) => x.type === "blob" && x.path && safePath(x.path))
      .map((x: { path: string }) => x.path)
      .slice(0, 1200);

    const selection = await gemini(`You are the Royal Command senior developer. Select up to ${MAX_FILES} existing source files that most likely need editing for the instruction below. Return JSON only: {"paths":["src/..."],"reason":"..."}. Do not select auth, middleware, secrets, env files, lockfiles, or generated files.\n\nINSTRUCTION:\n${instruction}\n\nREPOSITORY FILES:\n${paths.join("\n")}`);
    const selected = Array.isArray(selection.paths) ? selection.paths.filter((p: unknown) => typeof p === "string" && safePath(p)).slice(0, MAX_FILES) : [];
    if (!selected.length) return NextResponse.json({ error: "Gemini could not identify safe files to edit", selection }, { status: 422 });

    const snapshots = [];
    for (const path of selected) {
      const file = await github(`/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(BRANCH)}`);
      const content = Buffer.from(file.content || "", "base64").toString("utf8");
      snapshots.push({ path, content });
    }

    const patch = await gemini(`You are the Royal Command senior developer. Produce complete replacement contents for only the supplied files. Preserve existing features unless the instruction requires change. Return JSON only in this exact shape: {"summary":"short Korean summary","files":[{"path":"src/...","content":"complete file content"}]}. Never output secrets. Never modify authentication, middleware, environment variables, permissions, or security controls. Maximum ${MAX_FILES} files.\n\nINSTRUCTION:\n${instruction}\n\nCURRENT FILES:\n${snapshots.map((f) => `\n--- ${f.path} ---\n${f.content}`).join("\n")}`);
    const files = Array.isArray(patch.files)
      ? patch.files.filter((f: { path?: unknown; content?: unknown }) => typeof f.path === "string" && typeof f.content === "string" && safePath(f.path)).slice(0, MAX_FILES)
      : [];

    return NextResponse.json({ ok: true, executed: false, summary: patch.summary || selection.reason || "", files });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gemini development agent failed" }, { status: 500 });
  }
}
