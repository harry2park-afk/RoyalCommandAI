import { describe, expect, it } from "vitest";
import {
  developerProviderOrder,
  resolveDeveloperExecutionPrompt,
  resolvePromptProviders,
  shouldRunDeveloperAgent,
} from "./executionRouting";

describe("RC execution routing", () => {
  it("does not let other-AI review-only wording cancel Gemini execution", () => {
    const prompt = "Gemini만 실행 담당, 다른 AI는 검토만 하세요. AI Help UI를 실제 GitHub 개발 실행 경로로 수정하세요. Production에는 배포하지 마세요.";
    expect(shouldRunDeveloperAgent(prompt)).toBe(true);
    expect(resolvePromptProviders(prompt, ["google", "openai"])).toEqual(["google"]);
    expect(developerProviderOrder(prompt, ["google", "openai"])[0]).toBe("google");
  });

  it("routes Claude execution to Anthropic", () => {
    const prompt = "Claude만 실행 담당으로 이 TypeScript 오류를 실제로 수정해주세요. 다른 AI는 검토만.";
    expect(shouldRunDeveloperAgent(prompt)).toBe(true);
    expect(resolvePromptProviders(prompt, ["anthropic", "openai"])).toEqual(["anthropic"]);
  });

  it("routes Grok execution to xAI", () => {
    const prompt = "Grok 실행 담당. GitHub 파일을 수정하고 PR까지 생성하세요.";
    expect(shouldRunDeveloperAgent(prompt)).toBe(true);
    expect(resolvePromptProviders(prompt, ["xai", "openai"])).toEqual(["xai"]);
  });

  it("routes ChatGPT execution to OpenAI", () => {
    const prompt = "ChatGPT만 실행 담당. API 라우팅 코드를 수정하세요.";
    expect(shouldRunDeveloperAgent(prompt)).toBe(true);
    expect(resolvePromptProviders(prompt, ["openai", "google"])).toEqual(["openai"]);
  });

  it("allows all four AIs to be selected for work", () => {
    const prompt = "4 AI 모두 이 개발 작업에 들어가서 각자 작업하세요.";
    expect(shouldRunDeveloperAgent(prompt)).toBe(true);
    expect(resolvePromptProviders(prompt)).toEqual(["openai", "anthropic", "google", "xai"]);
  });

  it("recognizes natural Korean work commands as execution", () => {
    expect(shouldRunDeveloperAgent("4 AI 모두 이 GitHub 라우팅 작업을 끝내세요.")).toBe(true);
    expect(shouldRunDeveloperAgent("Gemini가 이 UI 작업을 실제로 작업하세요.")).toBe(true);
  });

  it("production safety gates do not cancel safe branch development", () => {
    const prompt = "Claude가 이 API 코드를 수정하세요. master에는 직접 쓰지 말고 Production에는 배포하지 마세요.";
    expect(shouldRunDeveloperAgent(prompt)).toBe(true);
    expect(resolvePromptProviders(prompt, ["anthropic"])).toEqual(["anthropic"]);
  });

  it("keeps truly read-only inspection out of execution", () => {
    const prompt = "Gemini만 실제 GitHub 저장소를 읽어서 원인만 검토하세요. 코드 수정 없이 보고만 해주세요.";
    expect(shouldRunDeveloperAgent(prompt)).toBe(false);
  });

  it("inherits the prior user developer order for a short continuation command", () => {
    const prior = "Gemini만 실행 담당, 다른 AI는 검토만 하세요. AI Help UI를 실제 GitHub 개발 실행 경로로 수정하세요. Production에는 배포하지 마세요.";
    const followUp = "네 위에 오더를 다시 실행 해주세요.";
    const resolved = resolveDeveloperExecutionPrompt(followUp, [
      { role: "user", content: prior },
      { role: "assistant", content: "이전 실행은 실패했습니다." },
    ]);

    expect(shouldRunDeveloperAgent(followUp)).toBe(false);
    expect(resolved).toContain(prior);
    expect(resolved).toContain(followUp);
    expect(resolvePromptProviders(resolved || "", ["google"])).toEqual(["google"]);
  });

  it("does not invent a developer continuation when no prior executable user order exists", () => {
    expect(resolveDeveloperExecutionPrompt("위 오더 다시 실행해주세요.", [
      { role: "user", content: "오늘 날씨 알려주세요." },
      { role: "assistant", content: "맑습니다." },
    ])).toBeNull();
  });

  it("does not inherit a prior order when the follow-up explicitly says not to execute", () => {
    const prior = "Gemini가 이 UI 코드를 수정하세요.";
    expect(resolveDeveloperExecutionPrompt("위 작업은 실행하지 말고 설명만 해주세요.", [
      { role: "user", content: prior },
    ])).toBeNull();
  });
});
