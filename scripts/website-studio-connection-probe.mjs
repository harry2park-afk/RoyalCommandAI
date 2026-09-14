// Manual diagnostic on one explicitly named Preview branch. No customer input.
// Never print tokens, model text, HTTP headers, raw errors, or redirect queries.
import { Sandbox } from "@vercel/sandbox";
const branch = "studio-work/connection-probe-20260914-7438370";
const emit = value => console.log("STUDIO_CONNECTION_PROBE " + JSON.stringify(value));
if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== branch) {
  emit({ skipped: true });
} else {
  emit({ context: "vercel-build", sha: process.env.VERCEL_GIT_COMMIT_SHA,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY), oidcConfigured: Boolean(process.env.VERCEL_OIDC_TOKEN),
    githubConfigured: Boolean(process.env.GITHUB_TOKEN), automationConfigured: Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET) });
  for (const [provider, model] of [["astra", "gpt-6-astra"], ["codex", "gpt-5.3-codex"]]) {
    if (!process.env.OPENAI_API_KEY) { emit({ provider, result: "not_configured" }); continue; }
    try {
      const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", redirect: "error", signal: AbortSignal.timeout(45000),
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: "Connection health check only. Reply with READY. Do not call tools.", max_output_tokens: 256, reasoning: { effort: "low" } }) });
      const data = await response.json();
      const hasText = Boolean(data.output_text || data.output?.some(item => item.content?.some(part => part.type === "output_text" && part.text)));
      const code = ["model_not_found", "insufficient_quota", "invalid_api_key", "permission_denied", "rate_limit_exceeded", "unsupported_parameter"].includes(data.error?.code) ? data.error.code : undefined;
      emit({ provider, model, httpStatus: response.status, errorCode: code, result: response.ok && hasText ? "response_received" : "failed" });
    } catch { emit({ provider, model, result: "request_failed_or_timeout" }); }
  }
  let sandbox;
  try {
    if (!process.env.VERCEL_OIDC_TOKEN) emit({ provider: "sandbox", result: "oidc_not_configured" });
    else {
      sandbox = await Sandbox.create({ image: "vercel/sandbox/node:24", persistent: false, networkPolicy: "deny-all", timeout: 60000, resources: { vcpus: 2 }, env: {} });
      const command = await sandbox.runCommand({ cmd: "node", args: ["-e", "process.exit(0)"], timeoutMs: 5000 });
      emit({ provider: "sandbox", result: command.exitCode === 0 ? "command_passed" : "command_failed" });
    }
  } catch (error) { emit({ provider: "sandbox", result: "create_or_command_failed", httpStatus: Number.isInteger(error?.status) ? error.status : undefined }); }
  finally {
    if (sandbox) {
      try { await sandbox.stop(); } catch { /* Still attempt deletion. */ }
      try { await sandbox.delete(); emit({ provider: "sandbox", cleanup: "passed" }); }
      catch { emit({ provider: "sandbox", cleanup: "failed" }); }
    }
  }
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    try {
      const response = await fetch("https://royal-command-dvh4nxof0-harry2park-afks-projects.vercel.app", {
        redirect: "manual", signal: AbortSignal.timeout(15000), headers: { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } });
      let destination;
      const location = response.headers.get("location");
      if (location) {
        const url = new URL(location, response.url);
        destination = url.origin === "https://vercel.com" && url.pathname === "/sso-api" ? "vercel_sso"
          : url.origin === "https://royal-command-ai-git-feat-indep-0be966-harry2park-afks-projects.vercel.app" ? "rc_canonical_preview" : "other_blocked";
      }
      await response.body?.cancel();
      emit({ provider: "preview-protection", httpStatus: response.status, redirect: destination,
        functionality: "not_checked", rcLogin: "not_checked" });
    } catch { emit({ provider: "preview-protection", result: "request_failed" }); }
  }
}
