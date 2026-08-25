export const dynamic = "force-static";

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

async function runCodexBuildSelfTest() {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("CODEX_LIVE_SELFTEST: OPENAI_API_KEY missing");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CODEX_MODEL,
      input: "Royal Command RC Builder build-time connectivity self-test. Reply exactly RC_CODEX_BUILD_OK",
      reasoning: { effort: "high" },
      max_output_tokens: 512,
    }),
    cache: "no-store",
  });

  const raw = await response.text();
  let body: any = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok) throw new Error(`CODEX_LIVE_SELFTEST: ${body?.error?.message || `HTTP ${response.status}`}`);

  const output = responseText(body);
  if (!output.includes("RC_CODEX_BUILD_OK")) {
    throw new Error(`CODEX_LIVE_SELFTEST: unexpected output from ${body?.model || CODEX_MODEL}`);
  }

  return { model: body?.model || CODEX_MODEL, responseId: body?.id || "ok" };
}

export default async function CodexLiveSelfTestPage() {
  const result = await runCodexBuildSelfTest();
  return <main>RC Builder Codex live build self-test passed: {result.model}</main>;
}
