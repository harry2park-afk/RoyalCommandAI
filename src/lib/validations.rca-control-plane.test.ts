import { describe, expect, it } from "vitest";
import { chatSchema } from "./validations";

describe("RCA Command Center server-authoritative five-AI routing", () => {
  it("forces the fixed five internal AIs for ordinary RCA orders", () => {
    const parsed = chatSchema.parse({
      roomId: "rca",
      prompt: "이 기능을 검토해 주세요.",
      providers: ["openai"],
    });

    expect(parsed.roomId).toBe("89fe50fc-12bf-4fa0-8da8-aff065bae960");
    expect(parsed.memberCommand.mode).toBe("inspect");
    expect(parsed.providers).toEqual(["openai", "anthropic", "google", "xai", "codex"]);
  });

  it("forces Codex as writer and the other four as reviewers for RCA EXECUTE", () => {
    const parsed = chatSchema.parse({
      roomId: "rca",
      prompt: [
        "RC Command Center 코드를 구현해 주세요.",
        "이번 작업은 EXECUTE 작업입니다.",
        "Codex를 Single Writer로 사용하고 다른 AI는 코드 수정 금지, 검토만 하세요.",
      ].join("\n"),
      providers: ["openai"],
    });

    expect(parsed.memberCommand.mode).toBe("execute");
    expect(parsed.providers).toEqual(["codex"]);
    expect(parsed.memberCommand.leadProviders).toEqual(["codex"]);
    expect(parsed.memberCommand.reviewOnlyProviders).toEqual(["openai", "anthropic", "google", "xai"]);
    expect(parsed.memberCommand.gitWrite).toBe(true);
  });

  it("does not inject Harry's fixed team into a customer UUID room", () => {
    const parsed = chatSchema.parse({
      roomId: "337009c3-a46d-40b1-bcc4-0282b0550000",
      prompt: "이 기능을 검토해 주세요.",
      providers: ["openai", "google"],
    });

    expect(parsed.providers).toEqual(["openai", "google"]);
  });
});
