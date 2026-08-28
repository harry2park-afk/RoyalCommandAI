import { describe, expect, it } from "vitest";
import { resolveRcMemberCommand } from "./rcMemberLayer";

const five = ["openai", "anthropic", "google", "xai", "codex"] as const;

describe("RC Member Layer", () => {
  it("routes the real relay website order to EXECUTE with one writer and four reviewers", () => {
    const prompt = [
      "RCA 홈페이지에 릴레이 개발 테스트를 실행하세요.",
      "목표: 홈페이지 하단 Footer 바로 위에 작은 테스트 문구 RCA Developer Relay Test를 추가하세요.",
      "기존 디자인과 기능은 그대로 유지하고 다른 화면이나 기능은 수정하지 않음.",
      "Writer 1명만 실제 Write, 나머지 선택 AI는 Review만 수행.",
      "안전 브랜치에서만 작업하고 Commit Evidence 없는 SUCCESS 금지.",
      "Production에는 Merge하지 않음.",
    ].join("\n");

    const command = resolveRcMemberCommand(prompt, undefined, [...five]);
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["openai"]);
    expect(command.reviewOnlyProviders).toEqual(["anthropic", "google", "xai", "codex"]);
    expect(command.gitWrite).toBe(true);
    expect(command.productionAllowed).toBe(false);
  });

  it("treats selected AI order as authoritative instead of provider names in prompt text", () => {
    const prompt = "Gemini만 실행 담당이라고 적혀 있어도 이 GitHub UI 작업을 실행하세요.";
    const command = resolveRcMemberCommand(prompt, undefined, ["anthropic", "google", "openai"]);
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["anthropic"]);
    expect(command.reviewOnlyProviders).toEqual(["google", "openai"]);
  });

  it("keeps explicit no-write inspection read-only", () => {
    const prompt = "현재 라우팅 코드를 읽고 무엇을 고쳐야 하는지 분석하세요. 코드 수정 없이 보고만 해주세요.";
    const command = resolveRcMemberCommand(prompt, undefined, ["xai", "openai"]);
    expect(command.mode).toBe("inspect");
    expect(command.leadProviders).toEqual(["xai", "openai"]);
    expect(command.reviewOnlyProviders).toEqual([]);
    expect(command.gitWrite).toBe(false);
  });

  it("recognizes natural Korean execution verbs", () => {
    for (const prompt of [
      "이 GitHub 라우팅 작업을 끝내세요.",
      "이 UI 작업을 실제로 작업하세요.",
      "이 페이지 변경을 수행하세요.",
    ]) {
      const command = resolveRcMemberCommand(prompt, undefined, ["google"]);
      expect(command.mode).toBe("execute");
      expect(command.gitWrite).toBe(true);
    }
  });

  it("inherits a prior executable order for a natural short continuation", () => {
    const prior = "AI Help UI 코드를 수정하세요.";
    const command = resolveRcMemberCommand(
      "위 오더 다시 실행해주세요.",
      [
        { role: "user", content: prior },
        { role: "assistant", content: "이전 실행은 실패했습니다." },
      ],
      ["google", "openai"],
    );
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["google"]);
    expect(command.reviewOnlyProviders).toEqual(["openai"]);
    expect(command.continuedFromPriorOrder).toBe(true);
    expect(command.effectivePrompt).toContain(prior);
  });

  it("follows a contiguous continuation chain", () => {
    const prior = "AI Help UI 코드를 수정하세요.";
    const command = resolveRcMemberCommand(
      "방금 작업 계속 진행해주세요.",
      [
        { role: "user", content: prior },
        { role: "assistant", content: "실행 실패" },
        { role: "user", content: "위 오더 다시 실행해주세요." },
        { role: "assistant", content: "다시 실패" },
      ],
      ["google"],
    );
    expect(command.mode).toBe("execute");
    expect(command.continuedFromPriorOrder).toBe(true);
    expect(command.effectivePrompt).toContain(prior);
  });

  it("does not jump across an unrelated user request", () => {
    const command = resolveRcMemberCommand(
      "위 오더 다시 실행해주세요.",
      [
        { role: "user", content: "AI Help UI 코드를 수정하세요." },
        { role: "assistant", content: "실행 실패" },
        { role: "user", content: "오늘 일정 알려주세요." },
        { role: "assistant", content: "일정입니다." },
      ],
      ["google"],
    );
    expect(command.mode).toBe("answer");
    expect(command.continuedFromPriorOrder).toBe(false);
  });

  it("does not invent execution when no selected AI is supplied", () => {
    const command = resolveRcMemberCommand("이 GitHub 작업을 실행하세요.");
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual([]);
    expect(command.gitWrite).toBe(false);
  });
});
