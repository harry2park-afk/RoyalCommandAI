import { describe, expect, it } from "vitest";
import { resolveRcMemberCommand } from "./rcMemberLayer";

const five = ["openai", "anthropic", "google", "xai", "codex"] as const;

describe("RC Command Center Control Plane execution classification", () => {
  it("keeps a mixed role-scoped Control Plane order executable with Codex as the sole writer", () => {
    const prompt = [
      "RC Command Center Development Control Plane v1을 현재 코드에 구현해 주세요.",
      "이번 작업은 EXECUTE 작업입니다.",
      "Codex를 Single Writer로 사용하고 ChatGPT, Claude, Gemini, Grok은 검토 역할로 참여시키세요.",
      "다른 AI는 코드 수정 금지이며 Codex만 실제 코드를 수정합니다.",
      "기존 기능을 유지하면서 필요한 최소 코드 변경만 수행하고 각 리뷰 결과를 반영한 뒤 Conflict Guard, 필요한 테스트, Vercel Preview까지 완료하세요.",
      "Production에는 반영하지 말고 Preview까지만 진행하세요.",
      "완료 후 Branch, Commit SHA, PR, Conflict Guard, Tests, Vercel Preview 증거를 한 번만 보고하세요.",
    ].join("\n");

    const command = resolveRcMemberCommand(prompt, undefined, [...five]);

    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["codex"]);
    expect(command.reviewOnlyProviders).toEqual(["openai", "anthropic", "google", "xai"]);
    expect(command.gitWrite).toBe(true);
    expect(command.productionAllowed).toBe(false);
  });

  it("still blocks a genuinely global no-write order", () => {
    const command = resolveRcMemberCommand(
      "현재 Control Plane 코드를 검토만 하세요. 어떤 AI도 코드를 수정하지 말고 READ-ONLY로 분석하세요.",
      undefined,
      [...five],
    );

    expect(command.mode).toBe("inspect");
    expect(command.gitWrite).toBe(false);
    expect(command.reviewOnlyProviders).toEqual([]);
  });
});
