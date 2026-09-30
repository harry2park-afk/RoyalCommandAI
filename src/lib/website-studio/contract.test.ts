import { describe, expect, it } from "vitest";
import { BRANCH, WRITABLE_PATHS, assertIdentity, assertPaths, assertPreview, canStartNewWork, claimStage, digest, openDesign, passStage, sealDesign, type WorkState } from "./contract";

const initial = (): WorkState => ({ version: 1, workId: "RC-STUDIO-test", requestHash: digest("request"), actorHash: digest("actor"), roomHash: digest("room"), orderHash: digest("order"), baseSha: "a".repeat(40), designVersion: 1, stage: "design", status: "waiting", passed: [] });
describe("Website Studio host authority", () => {
  it("allows a fresh work after a stopped pre-publication failure but never steals active or ambiguous publication locks", () => {
    expect(canStartNewWork({ ...initial(), status: "failed" })).toBe(true);
    expect(canStartNewWork({ ...initial(), status: "passed" })).toBe(true);
    expect(canStartNewWork({ ...initial(), status: "unsupported" })).toBe(true);
    expect(canStartNewWork(initial())).toBe(false);
    expect(canStartNewWork({ ...initial(), status: "running" })).toBe(false);
    expect(canStartNewWork({ ...initial(), status: "failed", commitSha: "b".repeat(40) })).toBe(false);
    expect(canStartNewWork({ ...initial(), status: "failed", commitSha: "b".repeat(40) }, true)).toBe(true);
    expect(canStartNewWork({ ...initial(), status: "running", commitSha: "b".repeat(40) }, true)).toBe(false);
  });
  it("recovers an approved design after a lost response without publishing its plaintext or using infrastructure keys", () => {
    const plaintext = JSON.stringify({ summary: "private design", paths: [...WRITABLE_PATHS] });
    const sealed = sealDesign(plaintext, "random-per-work-nonce", "work-1");
    expect(sealed).not.toContain("private design");
    expect(openDesign(sealed, "random-per-work-nonce", "work-1")).toBe(plaintext);
    expect(() => openDesign(sealed, "other-nonce", "work-1")).toThrow();
    expect(() => openDesign(sealed, "random-per-work-nonce", "work-2")).toThrow();
  });
  it("rejects Production and any unapproved Preview branch", () => {
    expect(() => assertPreview("production", BRANCH)).toThrow();
    expect(() => assertPreview("preview", "master")).toThrow();
    expect(() => assertPreview("preview", BRANCH)).not.toThrow();
  });
  it("binds user, Room, work ID, design version and base SHA", () => {
    const state = initial();
    expect(() => assertIdentity(state, "actor", "room", state.workId, 1, state.baseSha)).not.toThrow();
    for (const values of [["other", "room", state.workId, 1, state.baseSha], ["actor", "other", state.workId, 1, state.baseSha], ["actor", "room", "other", 1, state.baseSha], ["actor", "room", state.workId, 2, state.baseSha], ["actor", "room", state.workId, 1, "b".repeat(40)]] as const) {
      expect(() => assertIdentity(state, values[0], values[1], values[2], values[3], values[4])).toThrow();
    }
  });
  it("does not accept forged later-stage readiness or non-Codex writers", () => {
    expect(() => claimStage({ ...initial(), stage: "publish" }, "publish", "codex")).toThrow();
    expect(() => claimStage({ ...initial(), stage: "write", passed: ["design"] }, "write", "astra")).toThrow("CODEX_ONLY_WRITER");
  });
  it("requires a single ordered handoff and stops failed/in-flight work", () => {
    let state = initial();
    for (const stage of ["design", "write", "diff", "publish", "preview"] as const) {
      state = claimStage(state, stage, "codex");
      expect(() => claimStage(state, stage, "codex")).toThrow();
      expect(() => claimStage({ ...state, status: "failed" }, stage, "codex")).toThrow();
      state = passStage(state);
    }
    expect(state.status).toBe("passed");
    expect(state.passed).toEqual(["design", "write", "diff", "publish", "preview"]);
  });
  it("does not grant the model authority over shared UI, API, permissions or customer data", () => {
    expect(() => assertPaths([...WRITABLE_PATHS], [...WRITABLE_PATHS])).not.toThrow();
    for (const path of ["src/lib/auth.ts", "src/app/rooms/[id]/RoomV3.tsx", "supabase/migrations/test.sql", "package.json", "src/components/website-studio/../secrets.ts"]) expect(() => assertPaths([path], [path])).toThrow();
    expect(() => assertPaths([...WRITABLE_PATHS], [])).toThrow();
  });
});
