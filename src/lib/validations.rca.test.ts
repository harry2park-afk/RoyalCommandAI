import { describe, expect, it } from "vitest";
import { chatSchema } from "./validations";

const RCA = "rca";
const five = ["openai", "anthropic", "google", "xai", "codex"] as const;

describe("RCA Command Center provider routing", () => {
  it("honors an explicit Codex-only answer check", () => {
    const parsed = chatSchema.parse({
      roomId: RCA,
      prompt: "이번 요청에는 Codex만 답하십시오. 현재 연결 상태만 짧게 알려주세요.",
      providers: [...five],
    });
    expect(parsed.memberCommand.mode).toBe("answer");
    expect(parsed.providers).toEqual(["codex"]);
  });

  it("keeps the fixed five-member team for ordinary RCA questions", () => {
    const parsed = chatSchema.parse({
      roomId: RCA,
      prompt: "이 설계를 검토해 주세요.",
      providers: ["openai"],
    });
    expect(parsed.memberCommand.mode).toBe("inspect");
    expect(parsed.providers).toEqual([...five]);
  });

  it("does not weaken Codex single-writer execute routing", () => {
    const parsed = chatSchema.parse({
      roomId: RCA,
      prompt: "EXECUTE 작업입니다. Codex만 실제 Writer로 코드 변경을 수행하고 다른 AI는 Review Only로 참여하세요.",
      providers: ["openai"],
    });
    expect(parsed.memberCommand.mode).toBe("execute");
    expect(parsed.memberCommand.leadProviders).toEqual(["codex"]);
    expect(parsed.memberCommand.reviewOnlyProviders).toEqual(["openai", "anthropic", "google", "xai"]);
    expect(parsed.providers).toEqual(["codex"]);
  });
});
