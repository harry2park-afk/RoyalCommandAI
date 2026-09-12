import { describe, expect, it } from "vitest";
import { isHarryEmail, isKatieGmailAction } from "./katie-gmail-policy";

describe("Katie Gmail policy", () => {
  it("allows only status, read and draft actions", () => {
    for (const action of ["status", "search", "message", "draft"])
      expect(isKatieGmailAction(action)).toBe(true);
    for (const action of ["send", "delete", "forward", "trash"])
      expect(isKatieGmailAction(action)).toBe(false);
  });

  it("is restricted to Harry's approved accounts", () => {
    expect(isHarryEmail("Harry2Park@gmail.com")).toBe(true);
    expect(isHarryEmail("harry@royalcommand.ai")).toBe(true);
    expect(isHarryEmail("customer@example.com")).toBe(false);
  });
});
