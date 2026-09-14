import { StudioError } from "./schema";

export type Deployment = { id: string; projectId: string; sha: string; url: string; ready: boolean; target: "preview" | "production" };
export function assertDeployment(deployment: Deployment, expected: { projectId: string; sha: string }) {
  const url = new URL(deployment.url);
  if (!deployment.id || deployment.target !== "preview" || !deployment.ready || deployment.projectId !== expected.projectId || deployment.sha !== expected.sha ||
      url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app") || url.port || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new StudioError("DEPLOYMENT_MISMATCH");
  }
  return url.origin;
}
/** This checks ONLY deployment protection. HTTP 200 is NOT RC login or E2E.
 * Call only with immutable URL returned by the trusted Vercel deployment API.
 * The secret exists in this host closure only, never in page JS or job records.
 */
export async function probeProtection(deployment: Deployment, expected: { projectId: string; sha: string }, secret: () => Promise<string>, request: typeof fetch = fetch) {
  const origin = assertDeployment(deployment, expected);
  const bypass = await secret();
  if (!bypass) throw new StudioError("AUTOMATION_BYPASS_NOT_CONNECTED");
  try {
    const response = await request(origin, { method: "GET", redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(20_000),
      headers: { "x-vercel-protection-bypass": bypass } });
    await response.body?.cancel();
    if (response.status >= 300 && response.status < 400) throw new StudioError("PREVIEW_REDIRECT_BLOCKED");
    if (response.status !== 200) throw new StudioError("PREVIEW_PROTECTION_FAILED");
    return { protection: "passed" as const, deploymentId: deployment.id, rcLogin: "not_checked" as const, functionality: "not_checked" as const };
  } catch (error) {
    if (error instanceof StudioError) throw error;
    throw new StudioError("PREVIEW_PROTECTION_FAILED");
  }
}
