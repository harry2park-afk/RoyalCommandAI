import { github } from "./github";

export const PREVIEW_ORIGIN = "https://royal-command-ai-git-feat-indep-0be966-harry2park-afks-projects.vercel.app";
export function previewSessionCookies(cookies: { name: string; value: string }[], projectRef: string) {
  const appCookie = `sb-${projectRef}-auth-token`;
  return cookies.filter(({ name }) => name === "_vercel_jwt" || name === appCookie ||
    (name.startsWith(`${appCookie}.`) && /^\d+$/.test(name.slice(appCookie.length + 1))))
    .map(({ name, value }) => ({ name, value }));
}

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
  const origin = PREVIEW_ORIGIN;
  const [{ default: chromium }, { chromium: playwright }] = await Promise.all([import("@sparticuz/chromium"), import("playwright-core")]);
  const browser = await playwright.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true, timeout: 20000 });
  let check = "ACCESS";
  try {
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: false });
    await context.addCookies(sessionCookies.map((cookie) => ({ ...cookie, url: origin, secure: true, httpOnly: true, sameSite: "Lax" as const })));
    const target = `${origin}/rooms/${roomId}`;
    // Observe the HTTP boundary without following or bypassing an auth redirect.
    const entry = await context.request.get(target, { maxRedirects: 0, timeout: 20000 });
    const location = entry.headers().location;
    const destination = location ? new URL(location, origin) : null;
    console.info("STUDIO_PREVIEW_ACCESS", { sha, from: target, status: entry.status(), to: destination ? `${destination.origin}${destination.pathname}` : target, vercelSessionPresent: sessionCookies.some(({ name }) => name === "_vercel_jwt"), appSessionPresent: sessionCookies.some(({ name }) => name.startsWith("sb-")) });
    if (entry.status() >= 300 && entry.status() < 400) throw new Error("PREVIEW_AUTH_REDIRECTED");
    if (!entry.ok()) throw new Error(`PREVIEW_HTTP_${entry.status()}`);
    const allowedApi = new Set([`/api/rooms/${roomId}`, "/api/ai/providers", "/api/auth/me", "/api/room-factory/rooms", "/api/tools/gateway", "/api/website-studio/work"]);
    await context.route("**/*", (route) => {
      const request = route.request(); const url = new URL(request.url());
      const allowed = url.origin === origin && ["GET", "HEAD"].includes(request.method()) &&
        (url.pathname === `/rooms/${roomId}` || url.pathname.startsWith("/_next/") || allowedApi.has(url.pathname) || /^\/[^/]+\.(js|css|png|svg|ico|webp)$/.test(url.pathname));
      return allowed ? route.continue() : route.abort();
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    const page = await context.newPage();
    // The full Room shell can hydrate after 15s on a cold Preview. Waiting longer
    // never relaxes the required DOM, authentication or exact-SHA assertions.
    page.setDefaultTimeout(60000);
    const assertServedSha = async () => {
      if (await page.locator("[data-studio-sha]").getAttribute("data-studio-sha") !== sha) throw new Error("PREVIEW_CLIENT_SHA_MISMATCH");
      const response = await context.request.get(`${origin}/api/website-studio/work?roomId=${roomId}`, { maxRedirects: 0, timeout: 15000, headers: { "Cache-Control": "no-cache" } });
      if (!response.ok() || (await response.json()).deploymentSha !== sha) throw new Error("PREVIEW_SERVER_SHA_MISMATCH");
    };
    check = "NAVIGATION";
    const navigation = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60000 });
    const landed = new URL(page.url());
    console.info("STUDIO_PREVIEW_NAVIGATION", { sha, status: navigation?.status(), to: `${landed.origin}${landed.pathname}` });
    if (landed.origin !== origin || landed.pathname !== `/rooms/${roomId}`) throw new Error("PREVIEW_REDIRECTED");
    check = "AUTHENTICATED_PANELS";
    await page.locator('[data-studio-worker="codex"]').waitFor({ state: "visible" });
    check = "SERVED_SHA";
    await assertServedSha();
    check = "PANELS";
    for (const role of ["astra", "codex", "github", "vercel"]) {
      if (await page.locator(`[data-studio-worker="${role}"]`).count() !== 1) throw new Error("PANEL_MISSING");
      const panel = page.locator(`[data-studio-worker="${role}"]`);
      const wasOpen = await panel.getAttribute("open");
      await panel.locator("summary").click();
      if ((await panel.getAttribute("open") !== null) === (wasOpen !== null)) throw new Error("PANEL_TOGGLE_FAILED");
      await panel.locator("summary").click();
    }
    check = "ORDER_CONTROL";
    if (!(await page.getByRole("heading", { name: "Give one order. Each specialist works independently, in a safe sequence.", exact: true }).isVisible())) throw new Error("STUDIO_HEADING_MISSING");
    const input = page.locator("textarea").first();
    await input.fill("Preview verification — do not submit");
    if (!await page.getByRole("button", { name: "Send", exact: true }).isEnabled()) throw new Error("ORDER_CONTROL_DISABLED");
    await input.fill("");
    check = "WAREHOUSE";
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
    check = "RELOAD";
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
  } catch (error) {
    if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) throw error;
    throw new Error(`PREVIEW_${check}_${error instanceof Error && error.name === "TimeoutError" ? "TIMEOUT" : "FAILED"}`);
  } finally { await browser.close(); }
}
