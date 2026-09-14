import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const REPOSITORY = "harry2park-afk/RoyalCommandAI";
export const BRANCH = "feat/independent-ai-rooms-v1-20260906";
export const PR = 748;
export const STAGES = ["design", "write", "diff", "publish", "preview"] as const;
export type Stage = typeof STAGES[number];
// This Preview approval does not delegate changes to shared Room UI or APIs.
export const WRITABLE_PATHS = ["src/components/website-studio/StudioWorkPanels.tsx"] as const;
export type WorkState = {
  version: 1; workId: string; requestHash: string; actorHash: string; roomHash: string;
  orderHash: string; baseSha: string; designVersion: number; designHash?: string;
  paths?: string[]; designArtifact?: string; treeSha?: string; commitSha?: string; stage: Stage;
  status: "waiting" | "running" | "passed" | "failed";
  passed: Stage[]; errorCode?: string; previewUrl?: string;
};
export function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function canStartNewWork(state: WorkState, publicationConfirmed = false) {
  return state.status === "passed" || (state.status === "failed" && (!state.commitSha || publicationConfirmed));
}
// A per-work random client nonce is saved before the first request. Its hash
// alone is public. No provider/infrastructure key doubles as an encryption key.
export function sealDesign(value: string, requestKey: string, workId: string) {
  const key = createHash("sha256").update(`studio-design-v1:${requestKey}:${workId}`).digest();
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(workId));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function openDesign(value: string, requestKey: string, workId: string) {
  const packed = Buffer.from(value, "base64url");
  const key = createHash("sha256").update(`studio-design-v1:${requestKey}:${workId}`).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, packed.subarray(0, 12));
  decipher.setAAD(Buffer.from(workId)); decipher.setAuthTag(packed.subarray(12, 28));
  return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8");
}
export function assertPreview(environment: string | undefined, branch: string | undefined) {
  if (environment !== "preview" || branch !== BRANCH) throw new Error("PREVIEW_BRANCH_REQUIRED");
}
export function assertIdentity(state: WorkState, actor: string, room: string, workId: string, version: number, baseSha: string) {
  if (state.actorHash !== digest(actor) || state.roomHash !== digest(room)) throw new Error("WORK_ACCESS_DENIED");
  if (state.workId !== workId || state.designVersion !== version || state.baseSha !== baseSha) throw new Error("WORK_IDENTITY_MISMATCH");
}
export function claimStage(state: WorkState, stage: Stage, provider: string): WorkState {
  if (state.status !== "waiting" || state.stage !== stage) throw new Error("STAGE_NOT_READY");
  if (stage === "write" && provider !== "codex") throw new Error("CODEX_ONLY_WRITER");
  if (STAGES.slice(0, STAGES.indexOf(stage)).some((step) => !state.passed.includes(step))) throw new Error("PRECEDING_STAGE_NOT_PASSED");
  return { ...state, status: "running" };
}
export function passStage(state: WorkState): WorkState {
  if (state.status !== "running") throw new Error("STAGE_NOT_RUNNING");
  const next = STAGES[STAGES.indexOf(state.stage) + 1];
  return { ...state, passed: [...state.passed, state.stage], stage: next || state.stage, status: next ? "waiting" : "passed" };
}
export function assertPaths(paths: string[], approved: string[]) {
  if (!paths.length || new Set(paths).size !== paths.length) throw new Error("INVALID_CANDIDATE_FILES");
  if (paths.some((path) => !(WRITABLE_PATHS as readonly string[]).includes(path) || !approved.includes(path))) throw new Error("FILE_OUTSIDE_DESIGN");
}
