import { describe, expect, it } from "vitest";
import { GLOBAL_UI_CHROME_LOCALE, shouldTranslateStoredContent, uiTextLocale } from "./globalLocaleUiPolicy";

describe("global locale UI policy", () => {
  it("keeps buttons, navigation and feature titles in English", () => {
    for (const role of ["action", "navigation", "feature_title", "dialog_title"] as const) {
      expect(uiTextLocale(role, "ko-KR")).toBe("en-US");
    }
    expect(GLOBAL_UI_CHROME_LOCALE).toBe("en-US");
  });

  it("localises explanatory content and AI responses", () => {
    for (const role of ["description", "help", "status_detail", "ai_response"] as const) {
      expect(uiTextLocale(role, "ko-KR")).toBe("ko-KR");
    }
  });

  it("never rewrites customer-authored content", () => {
    expect(uiTextLocale("customer_content", "ko-KR")).toBeNull();
    expect(shouldTranslateStoredContent("customer_content")).toBe(false);
  });
});
