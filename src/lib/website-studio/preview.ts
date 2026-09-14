import { github } from "./github";

type Deployment = { id: number; sha: string; environment: string; production_environment: boolean; creator: { login: string } };
export async function previewForSha(sha: string) {
  const deployments = await github<Deployment[]>(`/deployments?sha=${sha}&per_page=20`);
  for (const deployment of deployments) {
    if (deployment.sha !== sha || deployment.environment !== "Preview" || deployment.production_environment !== false || deployment.creator.login !== "vercel[bot]") continue;
    const statuses = await github<{ state: string; environment_url: string; creator: { login: string } }[]>(`/deployments/${deployment.id}/statuses?per_page=1`);
    const status = statuses[0];
    if (status && ["failure", "error"].includes(status.state)) throw new Error("PREVIEW_BUILD_FAILED");
    if (!status || status.state !== "success" || status.creator.login !== "vercel[bot]") continue;
    const url = new URL(status.environment_url);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !/^royal-command-[a-z0-9]+-harry2park-afks-projects\.vercel\.app$/.test(url.hostname)) throw new Error("PREVIEW_ORIGIN_INVALID");
    return url.origin;
  }
  throw new Error("PREVIEW_NOT_READY");
}

export async function verifyPreview(sha: string, roomId: string, sessionCookies: { name: string; value: string }[]) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("PREVIEW_SHA_INVALID");
  await previewForSha(sha);
  // Existing middleware canonicalizes Preview hosts. Preserve that policy and
  // verify both the built client and live server SHA on the fixed Preview alias.
  const origin = "https://royal-command-ai-git-feat-indep-0be966-harry2park-afks-projects.vercel.app";
  const [{ default: chromium }, { chromium: playwright }] = await Promise.all([import("@sparticuz/chromium"), import("playwright-core")]);
  const browser = await playwright.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true, timeout: 20000 });
  try {
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: false });
    await context.addCookies(sessionCookies.map((cookie) => ({ ...cookie, url: origin, secure: true, httpOnly: true, sameSite: "Lax" as const })));
    const allowedApi = new Set([`/api/rooms/${roomId}`, "/api/ai/providers", "/api/auth/me", "/api/room-factory/rooms", "/api/tools/gateway", "/api/website-studio/work"]);
    await context.route("**/*", (route) => {
      const request = route.request(); const url = new URL(request.url());
      const allowed = url.origin === origin && ["GET", "HEAD"].includes(request.method()) &&
        (url.pathname === `/rooms/${roomId}` || url.pathname.startsWith("/_next/") || allowedApi.has(url.pathname) || /^\/[^/]+\.(js|css|png|svg|ico|webp)$/.test(url.pathname));
      return allowed ? route.continue() : route.abort();
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const assertServedSha = async () => {
      if (await page.locator("[data-studio-sha]").getAttribute("data-studio-sha") !== sha) throw new Error("PREVIEW_CLIENT_SHA_MISMATCH");
      const response = await context.request.get(`${origin}/api/website-studio/work?roomId=${roomId}`, { maxRedirects: 0, timeout: 15000, headers: { "Cache-Control": "no-cache" } });
      if (!response.ok() || (await response.json()).deploymentSha !== sha) throw new Error("PREVIEW_SERVER_SHA_MISMATCH");
    };
    await page.goto(`${origin}/rooms/${roomId}`, { waitUntil: "domcontentloaded", timeout: 25000 });
    if (new URL(page.url()).origin !== origin) throw new Error("PREVIEW_REDIRECTED");
    await page.locator('[data-studio-worker="codex"]').waitFor({ state: "visible" });
    await assertServedSha();
    for (const role of ["astra", "codex", "github", "vercel"]) {
      if (await page.locator(`[data-studio-worker="${role}"]`).count() !== 1) throw new Error("PANEL_MISSING");
      const panel = page.locator(`[data-studio-worker="${role}"]`);
      const wasOpen = await panel.getAttribute("open");
      await panel.locator("summary").click();
      if ((await panel.getAttribute("open") !== null) === (wasOpen !== null)) throw new Error("PANEL_TOGGLE_FAILED");
      await panel.locator("summary").click();
    }
    if (!(await page.getByRole("heading", { name: "Give one order. Each specialist works independently, in a safe sequence.", exact: true }).isVisible())) throw new Error("STUDIO_HEADING_MISSING");
    const input = page.locator("textarea").first();
    await input.fill("Preview verification — do not submit");
    if (!await page.getByRole("button", { name: "Send", exact: true }).isEnabled()) throw new Error("ORDER_CONTROL_DISABLED");
    await input.fill("");
    await page.getByRole("button", { name: "AI Warehouse", exact: true }).click();
    for (const id of ["codex", "astra", "github", "vercel", "openai", "anthropic", "google", "xai"]) {
      const card = page.locator(`[data-warehouse-item="${id}"]`);
      const wasSelected = await card.getAttribute("aria-pressed") === "true";
      await card.click();
      if ((await card.getAttribute("aria-pressed") === "true") === wasSelected) throw new Error("WAREHOUSE_TOGGLE_FAILED");
      await card.click();
      if ((await card.getAttribute("aria-pressed") === "true") !== wasSelected) throw new Error("WAREHOUSE_RESTORE_FAILED");
      if (wasSelected) await card.click();
    }
    // All changes above are in this disposable browser's local preference store.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-studio-worker="codex"]').waitFor({ state: "visible" });
    await assertServedSha();
    await page.getByRole("button", { name: "AI Warehouse", exact: true }).click();
    for (const id of ["codex", "astra", "github", "vercel", "openai", "anthropic", "google", "xai"]) {
      if (await page.locator(`[data-warehouse-item="${id}"]`).getAttribute("aria-pressed") !== "false") throw new Error("WAREHOUSE_PERSISTENCE_FAILED");
    }
    // This verifier deliberately does not send orders or mutate customer data.
    // Host stage/lock tests verify mutation authority separately.
    await assertServedSha();
    return origin;
  } finally { await browser.close(); }
}
