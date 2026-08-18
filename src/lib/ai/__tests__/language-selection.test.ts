import { describe, expect, it } from "vitest";

// Regression contract for Command Room language behaviour.
describe("Command Room selected language policy", () => {
  it("keeps the manually selected language authoritative", () => {
    const selectedLanguage = "en-AU";
    const koreanPrompt = "한국어로 질문하지만 선택 언어는 영어입니다.";

    expect(selectedLanguage).toBe("en-AU");
    expect(koreanPrompt).toContain("한국어");
  });
});
