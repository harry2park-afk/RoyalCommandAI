import { describe, expect, it } from "vitest";
import { RCA_OPERATING_PROTOCOL, resolveRcMemberCommand } from "./rcMemberLayer";

const five = ["openai", "anthropic", "google", "xai", "codex"] as const;

describe("RC Member Layer", () => {
  it("routes the real relay website order to EXECUTE with Codex as writer and four reviewers", () => {
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
    expect(command.leadProviders).toEqual(["codex"]);
    expect(command.reviewOnlyProviders).toEqual(["openai", "anthropic", "google", "xai"]);
    expect(command.gitWrite).toBe(true);
    expect(command.productionAllowed).toBe(false);
  });

  it("prefers Codex as the writer whenever Codex is selected", () => {
    const command = resolveRcMemberCommand(
      "이 UI 코드를 수정하고 안전 브랜치에 반영하세요.",
      undefined,
      ["openai", "google", "codex", "xai"],
    );
    expect(command.mode).toBe("execute");
    expect(command.leadProviders).toEqual(["codex"]);
    expect(command.reviewOnlyProviders).toEqual(["openai", "google", "xai"]);
  });

  it("preserves selected-order fallback when Codex is not selected", () => {
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

  it("keeps Vercel cancellation safety review read-only even when deployment and commit nouns are nearby", () => {
    const prompt = [
      "Vercel Preview 하나가 BUILDING 상태에서 비정상적으로 오래 멈춰 있습니다.",
      "Production은 정상 READY 상태입니다.",
      "멈춘 것은 Production이 아니라 Preview 배포입니다.",
      "해당 Preview의 마지막 커밋은 문구 1줄만 수정한 작업입니다.",
      "이 stuck Preview만 Cancel해도 현재 Production, GitHub 코드, 브랜치, PR에 문제가 생기지 않는지 검토해주세요.",
    ].join("\n");

    const command = resolveRcMemberCommand(prompt, undefined, [...five]);
    expect(command.mode).toBe("inspect");
    expect(command.gitWrite).toBe(false);
    expect(command.leadProviders).toEqual([...five]);
    expect(command.reviewOnlyProviders).toEqual([]);
  });

  it("does not mistake deployment and commit status language for a write command", () => {
    const command = resolveRcMemberCommand(
      "Preview 배포 상태와 마지막 커밋 내용을 검토하고 위험을 분석해주세요.",
      undefined,
      ["openai", "google"],
    );
    expect(command.mode).toBe("inspect");
    expect(command.gitWrite).toBe(false);
  });

  it("injects the same host operating protocol into inspection orders", () => {
    const prompt = "Vercel Preview 상태를 검토하고 원인만 분석해주세요.";
    const command = resolveRcMemberCommand(prompt, undefined, ["openai", "google"]);
    expect(command.mode).toBe("inspect");
    expect(command.effectivePrompt).toContain(RCA_OPERATING_PROTOCOL);
    expect(command.effectivePrompt).toContain("CURRENT USER ORDER:");
    expect(command.effectivePrompt).toContain(prompt);
    expect(command.effectivePrompt).toContain("Words such as GitHub, commit, push, merge, Vercel, deploy, Production, Preview");
    expect(command.effectivePrompt).toContain("If the current order is ambiguous between review and execution, remain read-only");
  });

  it("injects the host operating protocol into execution orders without weakening single-writer routing", () => {
    const command = resolveRcMemberCommand(
      "이 GitHub 코드를 수정하고 변경사항을 커밋하세요.",
      undefined,
      ["openai", "google"],
    );
    expect(command.mode).toBe("execute");
    expect(command.gitWrite).toBe(true);
    expect(command.leadProviders).toEqual(["openai"]);
    expect(command.reviewOnlyProviders).toEqual(["google"]);
    expect(command.effectivePrompt).toContain(RCA_OPERATING_PROTOCOL);
    expect(command.effectivePrompt).toContain("Single Write Authority");
    expect(command.effectivePrompt).toContain("Never report SUCCESS without host-verifiable evidence");
  });

  it("leaves ordinary answer prompts unchanged", () => {
    const prompt = "이 기능이 무엇인지 설명해주세요.";
    const command = resolveRcMemberCommand(prompt, undefined, ["openai"]);
    expect(command.mode).toBe("answer");
    expect(command.effectivePrompt).toBe(prompt);
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

  it("keeps explicit commit orders executable", () => {
    const command = resolveRcMemberCommand(
      "이 GitHub 코드를 수정하고 변경사항을 커밋하세요.",
      undefined,
      ["openai", "google"],
    );
    expect(command.mode).toBe("execute");
    expect(command.gitWrite).toBe(true);
    expect(command.leadProviders).toEqual(["openai"]);
    expect(command.reviewOnlyProviders).toEqual(["google"]);
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
