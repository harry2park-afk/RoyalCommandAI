import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";
import { assertDeployment, probeProtection, type Deployment } from "./preview";
import { StudioError } from "./schema";

/** Host-owned calculator assertions. No model-written test file is executed here.
 * For reviewed STATIC test deployments only, whose build secret isolation has
 * been independently verified. RC user login is a separate controller assertion.
 */
export async function verifyCalculator(deployment: Deployment, expected: { projectId: string; sha: string }, secret: () => Promise<string>) {
  const origin = assertDeployment(deployment, expected);
  await probeProtection(deployment, expected, secret);
  const bypass = await secret();
  if (!bypass) throw new StudioError("AUTOMATION_BYPASS_NOT_CONNECTED");
  const browser = await playwright.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    let unsafeRequest = false;
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin || !["GET", "HEAD"].includes(request.method())) { unsafeRequest = true; await route.abort(); return; }
      try {
        const response = await route.fetch({ maxRedirects: 0, headers: { ...request.headers(), "x-vercel-protection-bypass": bypass } });
        if (response.status() >= 300 && response.status() < 400) { unsafeRequest = true; await route.abort(); return; }
        // Never forward auth cookies/headers back into the browser context.
        const headers = response.headers(); delete headers["set-cookie"]; delete headers["x-vercel-protection-bypass"];
        await route.fulfill({ response, headers });
      } catch { unsafeRequest = true; await route.abort(); }
    });
    await context.routeWebSocket("**/*", socket => { unsafeRequest = true; socket.close(); });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    await page.goto(origin, { waitUntil: "networkidle" });
    if (new URL(page.url()).origin !== origin) throw new StudioError("PREVIEW_ORIGIN_CHANGED");
    const add = async (quantity: string, price: string) => {
      await page.locator("#quantity").fill(quantity); await page.locator("#price").fill(price); await page.locator("#add").click();
    };
    const total = async (value: string) => { if ((await page.locator("#total").textContent())?.trim() !== value) throw new StudioError("CALCULATOR_ASSERTION_FAILED"); };
    await add("2", "10"); await add("3", "5"); await total("35");
    await page.locator("#locale").selectOption("ko"); await total("35");
    if ((await page.locator("#add").textContent())?.trim() !== "항목 추가") throw new StudioError("LOCALE_ASSERTION_FAILED");
    await page.locator("#items button").first().click(); await total("15");
    await add("-1", "10"); await total("15");
    if (!(await page.locator("#error").textContent())?.trim()) throw new StudioError("VALIDATION_ASSERTION_FAILED");
    await add("abc", "10"); await total("15");
    await page.locator("#locale").selectOption("en"); await total("15");
    if ((await page.locator("#add").textContent())?.trim() !== "Add item") throw new StudioError("LOCALE_ASSERTION_FAILED");
    await page.locator("#reset").click(); await total("0");
    if (unsafeRequest) throw new StudioError("PREVIEW_UNSAFE_REQUEST");
    await context.close();
    return { checks: ["sum_35", "remove_15", "negative_rejected", "text_rejected", "reset_0", "locale_state_preserved"], commitSha: expected.sha, deploymentId: deployment.id };
  } catch { throw new StudioError("CALCULATOR_ACCEPTANCE_FAILED"); }
  finally { await browser.close(); }
}
