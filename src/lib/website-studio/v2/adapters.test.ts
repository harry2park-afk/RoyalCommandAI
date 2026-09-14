import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { digest, sealDesign } from "../contract";
import { decryptLegacyDesign, readLegacyDesign } from "./legacy";
import { assertDeployment, probeProtection } from "./preview";
import { readiness, required } from "./readiness";
import { validatePaths, validateTarget } from "./schema";

describe("legacy read-only adapter", () => {
  it("verifies original bytes before adding an outcome", () => {
    const raw = JSON.stringify({ summary: "original", paths: ["src/app.ts"], checks: ["panels_present"] });
    expect(readLegacyDesign(raw, digest(raw)).outcome).toBe("accepted");
    expect(() => readLegacyDesign(raw + " ", digest(raw))).toThrow("LEGACY_DIGEST_MISMATCH");
    expect(JSON.parse(raw).outcome).toBeUndefined();
  });
  it("requires original nonce and preserves unsupported", () => {
    const raw = JSON.stringify({ outcome: "unsupported", summary: "scope", reason: "outside scope" });
    const workId = randomUUID(), requestKey = randomUUID();
    const input = { artifact: sealDesign(raw, requestKey, workId), designHash: digest(raw), workId };
    expect(() => decryptLegacyDesign(input)).toThrow("LEGACY_KEY_REQUIRED");
    expect(decryptLegacyDesign({ ...input, requestKey }).outcome).toBe("unsupported");
  });
});
describe("preview protection mock transport; not live authentication", () => {
  const deployment = { id: "dpl_test", projectId: "prj_test", sha: "a".repeat(40), url: "https://immutable-test.vercel.app", ready: true, target: "preview" as const };
  const expected = { projectId: "prj_test", sha: "a".repeat(40) };
  it("uses header on exact origin and does not claim login/functionality", async () => {
    const request = vi.fn(async () => new Response("ok"));
    const result = await probeProtection(deployment, expected, async () => "TEST_CANARY", request);
    expect(request).toHaveBeenCalledWith(deployment.url, expect.objectContaining({ redirect: "manual", headers: { "x-vercel-protection-bypass": "TEST_CANARY" } }));
    expect(result).toMatchObject({ protection: "passed", rcLogin: "not_checked", functionality: "not_checked" });
    expect(JSON.stringify(result)).not.toContain("TEST_CANARY");
  });
  it("blocks redirects without following or exposing their destination", async () => {
    const request = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://external.invalid/?secret=CANARY" } }));
    await expect(probeProtection(deployment, expected, async () => "CANARY", request)).rejects.toThrow("PREVIEW_REDIRECT_BLOCKED");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("blocks production, wrong SHA and missing secret before fetch", async () => {
    const request = vi.fn();
    expect(() => assertDeployment({ ...deployment, target: "production" }, expected)).toThrow("DEPLOYMENT_MISMATCH");
    expect(() => assertDeployment(deployment, { ...expected, sha: "b".repeat(40) })).toThrow("DEPLOYMENT_MISMATCH");
    await expect(probeProtection(deployment, expected, async () => "", request)).rejects.toThrow("AUTOMATION_BYPASS_NOT_CONNECTED");
    expect(request).not.toHaveBeenCalled();
  });
});
describe("scope and readiness", () => {
  it("Connected is insufficient; expired or other-project evidence is rejected", () => {
    expect(readiness({ astra: { connected: true } }, "project", 100).ready).toBe(false);
    const evidence = Object.fromEntries(required.map(key => [key, { connected: true, verifiedAt: 99, expiresAt: 101, targetId: "project" }]));
    expect(readiness(evidence, "project", 100).ready).toBe(true);
    expect(readiness(evidence, "other", 100).ready).toBe(false);
    expect(readiness(evidence, "project", 101).ready).toBe(false);
  });
  it.each(["master", "main", "refs/heads/studio-work/test", "studio-work/../master"])("rejects branch %s", branch => {
    expect(() => validateTarget({ repositoryId: "42", repository: "test/site", branch, baseSha: "a".repeat(40), vercelProjectId: "prj_test" })).toThrow();
  });
  it.each(["src/../secret", "src/.env", ".github/workflows/run.yml", "src/middleware.ts"])("rejects unsafe file %s even if proposed by design", path => {
    expect(() => validatePaths([path], [path])).toThrow("UNSAFE_CANDIDATE_PATHS");
  });
});
