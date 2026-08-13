import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { actionSchemaInstruction, decodeActionContent, parseJsonObject, type EncodedDevAction } from "@/lib/ai/devAgentCodec";

const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const GOOGLE_MODEL = process.env.GOOGLE_AI_MODEL || "gemini-3.6-flash";
const MAX_FILES = 8;
const MAX_FILE_BYTES = 180_000;
const OWNER_DEV_EMAILS = ["harry2park@gmail.com", "harry@royalcommand.ai"];

type DevAction = {
  path: string;
  operation: "create" | "update" | "delete";
  content?: string;
  reason?: string;
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
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) throw new Error(data?.message || `GitHub HTTP ${response.status}`);
  return data;
}

async function geminiDirect(prompt: string) {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 12000,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const reason = data?.error?.details?.find?.((item: any) => item?.reason)?.reason;
    throw new Error(`${data?.error?.message || `Gemini HTTP ${response.status}`}${reason ? ` [${reason}]` : ""}`);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "{}";
  return parseJsonObject(text);
}

async function resolveOpenRouterGeminiModel(key: string) {
  const preferred = process.env.OPENROUTER_GEMINI_MODEL;
  if (preferred) return preferred;

  const url = new URL("https://openrouter.ai/api/v1/models");
  url.searchParams.set("q", "gemini");
  url.searchParams.set("sort", "most-popular");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenRouter model lookup failed (${response.status})`);
  const models = Array.isArray(data?.data) ? data.data : [];
  const model = models.find((item: any) => typeof item?.id === "string" && item.id.startsWith("google/gemini"))?.id;
  if (!model) throw new Error("No Gemini model is currently available through OpenRouter");
  return model;
}

async function geminiViaOpenRouter(prompt: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured for Gemini fallback");
  const model = await resolveOpenRouterGeminiModel(key);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://royalcommand.ai",
      "X-Title": "RoyalCommand.ai Gemini Developer Agent",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are Gemini operating as the Royal Command senior autonomous developer. Return strict JSON only, with no markdown fences or prose outside JSON. When returning file contents, always Base64-encode the complete UTF-8 file and place it in contentBase64. Never place raw source code inside a JSON string.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 12000,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenRouter Gemini request failed (${response.status})`);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("OpenRouter Gemini returned an empty response");
  return parseJsonObject(content);
}

async function gemini(prompt: string) {
  try {
    return await geminiDirect(prompt);
  } catch (directError) {
    if (!process.env.OPENROUTER_API_KEY) throw directError;
    try {
      return await geminiViaOpenRouter(prompt);
    } catch (fallbackError) {
      const directMessage = directError instanceof Error ? directError.message : String(directError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`Google Gemini direct failed: ${directMessage}; OpenRouter Gemini fallback failed: ${fallbackMessage}`);
    }
  }
}

async function getFile(path: string) {
  try {
    const file = await github(`/contents/${pathForApi(path)}?ref=${encodeURIComponent(BRANCH)}`);
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

async function executeAction(action: DevAction, instruction: string) {
  const path = String(action.path || "").trim();
  const operation = action.operation;

  if (!safePath(path)) throw new Error(`Unsafe path rejected: ${path}`);
  if (sensitivePath(path) && !explicitSensitiveInstruction(instruction)) {
    throw new Error(`Sensitive file requires an explicit security/auth instruction: ${path}`);
  }

  const current = await getFile(path);
  const commitMessage = `Gemini dev agent: ${instruction.slice(0, 72)}`;

  if (operation === "delete") {
    if (!current.exists) throw new Error(`Cannot delete missing file: ${path}`);
    const result = await github(`/contents/${pathForApi(path)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: commitMessage, sha: current.sha, branch: BRANCH }),
    });
    return { path, operation, commit: result.commit?.sha || "" };
  }

  const content = String(action.content || "");
  if (!content) throw new Error(`Empty content rejected: ${path}`);
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new Error(`File too large: ${path}`);

  if (operation === "create" && current.exists) throw new Error(`File already exists: ${path}`);
  if (operation === "update" && !current.exists) throw new Error(`File does not exist: ${path}`);

  const body: Record<string, unknown> = {
    message: commitMessage,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: BRANCH,
  };
  if (current.exists) body.sha = current.sha;

  const result = await github(`/contents/${pathForApi(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { path, operation, commit: result.commit?.sha || "" };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    authenticated: true,
    developer: isDeveloper(user.email),
    geminiConfigured: Boolean(process.env.GOOGLE_AI_API_KEY),
    geminiFallbackConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    githubConfigured: Boolean(process.env.GITHUB_TOKEN),
    developerAccessConfigured: developerEmails().length > 0,
    repo: REPO,
    branch: BRANCH,
  });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isDeveloper(user.email)) {
      return NextResponse.json({ error: "Developer access is not enabled for this account" }, { status: 403 });
    }

    const body = await request.json();
    const instruction = String(body?.instruction || "").trim();
    const execute = body?.execute === true;
    const proposed = Array.isArray(body?.actions) ? body.actions : Array.isArray(body?.files) ? body.files : null;

    if (!instruction) return NextResponse.json({ error: "Instruction is required" }, { status: 400 });

    if (execute) {
      if (!proposed?.length) return NextResponse.json({ error: "No approved actions supplied" }, { status: 400 });
      const actions: DevAction[] = proposed.slice(0, MAX_FILES).map((item: any) => ({
        path: String(item.path || ""),
        operation: item.operation === "create" || item.operation === "delete" ? item.operation : "update",
        content: typeof item.content === "string" ? item.content : typeof item.contentBase64 === "string" ? Buffer.from(item.contentBase64, "base64").toString("utf8") : undefined,
        reason: typeof item.reason === "string" ? item.reason : undefined,
      }));

      const commits = [];
      for (const action of actions) commits.push(await executeAction(action, instruction));
      return NextResponse.json({ ok: true, executed: true, commits });
    }

    const tree = await github(`/git/trees/${encodeURIComponent(BRANCH)}?recursive=1`);
    const paths = (tree.tree || [])
      .filter((entry: { type?: string; path?: string; size?: number }) =>
        entry.type === "blob" && entry.path && safePath(entry.path) && (entry.size || 0) <= MAX_FILE_BYTES,
      )
      .map((entry: { path: string }) => entry.path)
      .slice(0, 1800);

    const selection = await gemini(`You are the Royal Command senior autonomous developer. Analyze the user's instruction and select up to ${MAX_FILES} repository files that should be read before editing. You may also propose NEW files. Return JSON only in this exact form: {"readPaths":["src/..."],"newPaths":["src/..."],"reason":"short Korean explanation"}. Never select .env, secret, credential, certificate, private key, lockfile, or generated files. Preserve security boundaries.\n\nUSER INSTRUCTION:\n${instruction}\n\nREPOSITORY FILES:\n${paths.join("\n")}`);

    const readPaths = Array.isArray(selection.readPaths)
      ? selection.readPaths.filter((path: unknown) => typeof path === "string" && safePath(path)).slice(0, MAX_FILES)
      : [];
    const newPaths = Array.isArray(selection.newPaths)
      ? selection.newPaths.filter((path: unknown) => typeof path === "string" && safePath(path)).slice(0, MAX_FILES)
      : [];

    const snapshots: Array<{ path: string; content: string }> = [];
    for (const path of readPaths) {
      const file = await getFile(path);
      if (file.exists) snapshots.push({ path, content: file.content });
    }

    const patch = await gemini(`You are the Royal Command senior autonomous developer. Produce a safe, minimal implementation plan as executable file actions. ${actionSchemaInstruction()} Use at most ${MAX_FILES} actions. Do not expose or create secrets. Do not weaken authentication, authorization, or security controls. Only touch sensitive auth/security files when the user's instruction explicitly asks for that work. Preserve existing features unless the instruction requires change.\n\nUSER INSTRUCTION:\n${instruction}\n\nPOSSIBLE NEW FILES:\n${newPaths.join("\n")}\n\nCURRENT FILES:\n${snapshots.map((file) => `\n--- ${file.path} ---\n${file.content}`).join("\n")}`);

    const actions: DevAction[] = Array.isArray(patch.actions)
      ? patch.actions
          .map((item: EncodedDevAction) => ({
            path: String(item.path || ""),
            operation: item.operation === "create" || item.operation === "delete" ? item.operation : "update",
            content: decodeActionContent(item),
            reason: typeof item.reason === "string" ? item.reason : undefined,
          }))
          .filter((item: DevAction) => safePath(item.path))
          .filter((item: DevAction) => !sensitivePath(item.path) || explicitSensitiveInstruction(instruction))
          .slice(0, MAX_FILES)
      : [];

    if (!actions.length) {
      return NextResponse.json({ error: "Gemini could not produce a safe executable change set", selection, patch }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      executed: false,
      summary: patch.summary || selection.reason || "",
      actions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gemini development agent failed" },
      { status: 500 },
    );
  }
}
