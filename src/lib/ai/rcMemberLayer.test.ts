import { describe, expect, it } from "vitest";
import { resolveRcMemberCommand } from "./rcMemberLayer";

describe("RC Member Layer", () => {
  it("routes the real Gemini root-cause investigation order to INSPECT, never EXECUTE", () => {
    const prompt = [
      "Gemini만 조사 담당입니다. 다른 AI는 검토만 하세요.",
      "지난 한 달 이상 Royal Command에서 ChatGPT는 실제 GitHub 개발 작업을 수행하는데 Gemini는 반복적으로 실패했습니다.",
      "실제 RC 저장소와 현재 실행 구조를 읽고 왜 이런 일이 반복됐는지 근본 원인을 조사하세요.",
      "ChatGPT 실행 경로와 Gemini 실행 경로가 정확히 무엇이 다른지도 분석하세요.",
      "지금은 코드 수정 금지. GitHub Commit/PR 생성 금지. Production 변경 금지.",
      "ChatGPT와 같은 수준으로 안정적으로 개발하려면 무엇을 바꿔야 하는지만 보고하세요.",
    ].join("\n");

    const command = resolveRcMemberCommand(prompt, undefined, ["openai", "google", "anthropic", "xai"]);
    expect(command.mode).toBe("inspect");
    expect(command.leadProviders).toEqual(["google"]);
    expect(command.reviewOnlyProviders).toEqual(["openai", "anthropic", "xai"]);
    expect(command.gitWrite).toBe(false);
    expect(command.productionAllowed).toBe(false);
  });

  it("routes Gemini UI implementation to EXECUTE through the shared host", () => {
    const prompt = "Gemini만 실행 담당, 다른 AI는 검토만 하세요. AI Help UI 레이아웃을 실제 GitHub 개발 실행 경로로 수정해주세요. Production에는 배포하지 마세요.";
    const command = resolveRcMemberCommand(prompt, undefined, ["openai", "google", "anthropic", "xai"]);
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["google"]);
    expect(command.reviewOnlyProviders).toEqual(["openai", "anthropic", "xai"]);
    expect(command.gitWrite).toBe(true);
    expect(command.productionAllowed).toBe(false);
  });

  it("routes the exact 수행하세요 Gemini order to EXECUTE and removes reviewer-only control text", () => {
    const prompt = [
      "Gemini만 실행 담당입니다.",
      "AI Help UI의 실제 현재 코드를 GitHub에서 읽고, 사용자가 이전에 요청한 AI Help UI 위치 수정 작업을 실제 개발 실행 경로로 수행하세요.",
      "다른 AI는 실행하지 말고 검토만.",
      "master 직접 수정 금지. 안전 Branch 사용. Commit 생성. PR 생성. Production 배포 금지.",
    ].join("\n");
    const command = resolveRcMemberCommand(prompt, undefined, ["google", "openai"]);
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["google"]);
    expect(command.gitWrite).toBe(true);
    expect(command.effectivePrompt).not.toMatch(/다른\s*AI.*검토\s*만/i);
  });

  it("executes natural re-run first and keeps diagnosis as a follow-up report", () => {
    const prior = "Gemini만 실행 담당입니다. AI Help UI 위치를 실제 GitHub 개발 실행 경로로 수정해주세요.";
    const command = resolveRcMemberCommand(
      "위에것을 다시 실행 해줘요. 지금 자꾸 못하고있는데 뭐가 문제인지도 알아봐줘요.",
      [
        { role: "user", content: prior },
        { role: "assistant", content: "이전 실행 결과입니다." },
      ],
      ["google"],
    );
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["google"]);
    expect(command.gitWrite).toBe(true);
    expect(command.continuedFromPriorOrder).toBe(true);
    expect(command.effectivePrompt).toContain(prior);
    expect(command.effectivePrompt).toContain("execute the inherited development order first");
  });

  it("does not let a Production-only safety gate cancel safe-branch development", () => {
    const command = resolveRcMemberCommand("Claude가 이 API 코드를 수정해주세요. Production에는 배포하지 마세요.", undefined, ["anthropic"]);
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["anthropic"]);
    expect(command.gitWrite).toBe(true);
    expect(command.productionAllowed).toBe(false);
  });

  it("treats explicit code no-write as INSPECT even when the prompt discusses fixes", () => {
    const prompt = "Grok만 조사 담당. 현재 라우팅 코드를 읽고 무엇을 고쳐야 하는지 분석하세요. 코드 수정 없이 보고만 해주세요.";
    const command = resolveRcMemberCommand(prompt, undefined, ["xai", "openai"]);
    expect(command.mode).toBe("inspect");
    expect(command.leadProviders).toEqual(["xai"]);
    expect(command.gitWrite).toBe(false);
  });

  it("supports all four RC members with the same execution capability", () => {
    const command = resolveRcMemberCommand("4 AI 모두 이 GitHub 개발 작업을 실행하세요.", undefined, ["openai", "anthropic", "google", "xai"]);
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["openai", "anthropic", "google", "xai"]);
    expect(command.gitWrite).toBe(true);
  });

  it("inherits only the immediately preceding executable user-order chain", () => {
    const prior = "Gemini만 실행 담당. AI Help UI를 수정해주세요.";
    const command = resolveRcMemberCommand("위 오더 다시 실행해주세요.", [
      { role: "user", content: prior },
      { role: "assistant", content: "이전 실행 결과입니다." },
    ], ["google", "openai"]);
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["google"]);
    expect(command.continuedFromPriorOrder).toBe(true);
    expect(command.effectivePrompt).toContain(prior);
  });

  it("does not jump across an unrelated user request to inherit an old developer task", () => {
    const command = resolveRcMemberCommand("위 오더 다시 실행해주세요.", [
      { role: "user", content: "Gemini만 실행 담당. AI Help UI를 수정해주세요." },
      { role: "assistant", content: "이전 실행 결과입니다." },
      { role: "user", content: "오늘 일정 알려주세요." },
      { role: "assistant", content: "일정입니다." },
    ], ["google", "openai"]);
    expect(command.mode).toBe("answer");
    expect(command.continuedFromPriorOrder).toBe(false);
  });

  it("passes comprehensive regression suite for additional natural continuation utterances", () => {
    const prior = "Gemini만 실행 담당. API 라우터를 수정해주세요.";
    const variants = [
      "위에 것 다시 해줘요",
      "방금 작업 다시 실행해주세요",
      "그거 다시 하고 왜 실패했는지도 알려줘요",
      "이어서 끝내주세요",
      "다시 실행하되 Production에는 배포하지 마세요",
    ];

    for (const variant of variants) {
      const command = resolveRcMemberCommand(variant, [
        { role: "user", content: prior },
        { role: "assistant", content: "이전 실행 결과입니다." },
      ], ["google"]);
      expect(command.mode).toBe("execute");
      expect(command.leadProviders).toEqual(["google"]);
      expect(command.gitWrite).toBe(true);
      expect(command.continuedFromPriorOrder).toBe(true);
      expect(command.effectivePrompt).toContain(prior);
    }
  });
});
