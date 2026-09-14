import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { publishCandidate } from "./publication";
import { sourceDigest, type Job } from "./schema";

function job(): Job {
  const id = randomUUID();
  return { id, schemaVersion: 2, workflowVersion: 1, scope: { actorId: id, tenantId: id, roomId: id, projectId: id },
    target: { repository: "test/site", repositoryId: "42", baseSha: "a".repeat(40), branch: "studio-work/test", vercelProjectId: "prj_test" },
    requestHash: "d".repeat(64), keyHash: "e".repeat(64), orderArtifactId: id, revision: 1, fence: 1, stage: "publish", status: "running", passed: ["design", "write", "diff"],
    design: { outcome: "accepted", artifactId: id, acceptanceId: id, paths: ["src/app.ts"] },
    candidate: { artifactId: id, treeSha: "b".repeat(40), sourceDigest: sourceDigest([{ path: "src/app.ts", content: "test" }]), buildEvidenceId: id, testEvidenceId: id, acceptanceId: id, paths: ["src/app.ts"] } };
}
it("mock GitHub uses atomic expected head, not a force update", async () => {
  const request = vi.fn(async () => Response.json({ data: { createCommitOnBranch: { commit: { oid: "c".repeat(40), tree: { oid: "b".repeat(40) } } } } }));
  const result = await publishCandidate(job(), [{ path: "src/app.ts", contents: "dGVzdA==" }], async () => "TEST_CANARY", request);
  const init = (request.mock.calls as unknown as [string, RequestInit][])[0][1];
  const body = JSON.parse(String(init.body));
  expect(body.variables.input.expectedHeadOid).toBe("a".repeat(40));
  expect(init.redirect).toBe("error"); expect(JSON.stringify(result)).not.toContain("TEST_CANARY");
});
it("rejects untested bytes BEFORE retrieving credentials or making any mutation", async () => {
  const token = vi.fn(async () => "test"), request = vi.fn();
  await expect(publishCandidate(job(), [{ path: "src/app.ts", contents: Buffer.from("changed bytes").toString("base64") }], token, request)).rejects.toThrow("UNTESTED_PUBLICATION_CONTENT");
  expect(token).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
});
it("mock GitHub timeout is uncertain and never retried", async () => {
  const request = vi.fn(async () => { throw new Error("TEST_CANARY"); });
  await expect(publishCandidate(job(), [{ path: "src/app.ts", contents: "dGVzdA==" }], async () => "TEST_CANARY", request)).rejects.toThrow("PUBLICATION_UNCERTAIN");
  expect(request).toHaveBeenCalledTimes(1);
});
it("mock GitHub wrong tree is not accepted", async () => {
  const request = vi.fn(async () => Response.json({ data: { createCommitOnBranch: { commit: { oid: "c".repeat(40), tree: { oid: "f".repeat(40) } } } } }));
  await expect(publishCandidate(job(), [{ path: "src/app.ts", contents: "dGVzdA==" }], async () => "test", request)).rejects.toThrow("PUBLICATION_UNCERTAIN");
});
