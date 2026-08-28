import { describe, expect, it } from "vitest";
import {
  developerProviderOrder,
  resolveDeveloperExecutionPrompt,
  resolvePromptProviders,
  shouldRunDeveloperAgent,
} from "./executionRouting";

describe("RC execution routing", () => {
  it("uses the first selected active AI as the sole writer", () => {
    const prompt = "AI Help UI를 실제 GitHub 개발 실행 경로로 수정하세요. Production에는 배포하지 마세요.";
    expect(shouldRunDeveloperAgent(prompt, ["google", "openai"])).toBe(true);
    expect(resolvePromptProviders(prompt, ["google", "openai"])).toEqual(["google"]);
    expect(developerProviderOrder(prompt, ["google", "openai"])).toEqual(["google"]);
  });

  it("does not infer a writer from provider names in prompt text", () => {
    const prompt = "Claude만 실행 담당이라고 적혀 있어도 이 TypeScript 오류를 실제로 수정해주세요.";
    expect(resolvePromptProviders(prompt, ["openai", "anthropic"])).toEqual(["openai"]);
  });

  it("requires an explicitly selected provider before developer execution", () => {
    const prompt = "이 GitHub 파일을 수정하고 PR까지 생성하세요.";
    expect(shouldRunDeveloperAgent(prompt)).toBe(false);
    expect(resolvePromptProviders(prompt)).toEqual([]);
    expect(developerProviderOrder(prompt)).toEqual([]);
  });

  it("recognizes natural Korean work commands when an AI is selected", () => {
    expect(shouldRunDeveloperAgent("이 GitHub 라우팅 작업을 끝내세요.", ["openai"])).toBe(true);
    expect(shouldRunDeveloperAgent("이 UI 작업을 실제로 작업하세요.", ["google"])).toBe(true);
    expect(shouldRunDeveloperAgent("이 페이지 변경을 수행하세요.", ["xai"])).toBe(true);
  });

  it("production safety gates do not cancel safe branch development", () => {
    const prompt = "이 API 코드를 수정하세요. master에는 직접 쓰지 말고 Production에는 배포하지 마세요.";
    expect(shouldRunDeveloperAgent(prompt, ["anthropic"])).toBe(true);
    expect(resolvePromptProviders(prompt, ["anthropic"])).toEqual(["anthropic"]);
  });

  it("keeps truly read-only inspection out of execution", () => {
    const prompt = "실제 GitHub 저장소를 읽어서 원인만 검토하세요. 코드 수정 없이 보고만 해주세요.";
    expect(shouldRunDeveloperAgent(prompt, ["google"])).toBe(false);
  });

  it("inherits the prior user developer order for a short continuation command", () => {
    const prior = "AI Help UI를 실제 GitHub 개발 실행 경로로 수정하세요. Production에는 배포하지 마세요.";
    const followUp = "네 위에 오더를 다시 실행 해주세요.";
    const resolved = resolveDeveloperExecutionPrompt(
      followUp,
      [
        { role: "user", content: prior },
        { role: "assistant", content: "이전 실행은 실패했습니다." },
      ],
      ["google"],
    );

    expect(shouldRunDeveloperAgent(followUp, ["google"])).toBe(false);
    expect(resolved).toContain(prior);
    expect(resolved).toContain(followUp);
    expect(resolvePromptProviders(resolved || "", ["google"])).toEqual(["google"]);
  });

  it("follows only a contiguous continuation chain", () => {
    const prior = "AI Help UI 코드를 수정하세요.";
    const continuation = "위 오더 다시 실행해주세요.";
    const resolved = resolveDeveloperExecutionPrompt(
      "방금 작업 계속해주세요.",
      [
        { role: "user", content: prior },
        { role: "assistant", content: "실행 실패" },
        { role: "user", content: continuation },
        { role: "assistant", content: "다시 실패" },
      ],
      ["google"],
    );
    expect(resolved).toContain(prior);
  });

  it("does not jump across an unrelated user request to an older developer order", () => {
    const oldDeveloperOrder = "AI Help UI 코드를 수정하세요.";
    const resolved = resolveDeveloperExecutionPrompt(
      "위 오더 다시 실행해주세요.",
      [
        { role: "user", content: oldDeveloperOrder },
        { role: "assistant", content: "실행 실패" },
        { role: "user", content: "오늘 날씨 알려주세요." },
        { role: "assistant", content: "맑습니다." },
      ],
      ["google"],
    );
    expect(resolved).toBeNull();
  });

  it("does not invent a developer continuation when no prior executable user order exists", () => {
    expect(resolveDeveloperExecutionPrompt(
      "위 오더 다시 실행해주세요.",
      [
        { role: "user", content: "오늘 날씨 알려주세요." },
        { role: "assistant", content: "맑습니다." },
      ],
      ["google"],
    )).toBeNull();
  });

  it("does not inherit a prior order when the follow-up explicitly says not to execute", () => {
    const prior = "이 UI 코드를 수정하세요.";
    expect(resolveDeveloperExecutionPrompt(
      "위 작업은 실행하지 말고 설명만 해주세요.",
      [{ role: "user", content: prior }],
      ["google"],
    )).toBeNull();
  });
});
