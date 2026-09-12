import { describe, expect, it } from "vitest";
import {
  isHarryEmail,
  isKatieGmailAction,
  katieGmailNeedsApproval,
} from "./katie-gmail-policy";

describe("Katie Gmail policy", () => {
  it("allows only reading, approved draft and approved send actions", () => {
    for (const action of [
      "status",
      "search",
      "message",
      "thread",
      "attachment",
      "draft",
      "send",
    ])
      expect(isKatieGmailAction(action)).toBe(true);
    for (const action of ["delete", "forward", "trash"])
      expect(isKatieGmailAction(action)).toBe(false);
  });

  it("is restricted to Harry's approved accounts", () => {
    expect(isHarryEmail("Harry2Park@gmail.com")).toBe(true);
    expect(isHarryEmail("harry@royalcommand.ai")).toBe(true);
    expect(isHarryEmail("customer@example.com")).toBe(false);
  });

  it("requires explicit approval for every Gmail write", () => {
    expect(katieGmailNeedsApproval("draft")).toBe(true);
    expect(katieGmailNeedsApproval("send")).toBe(true);
    expect(katieGmailNeedsApproval("message")).toBe(false);
    expect(katieGmailNeedsApproval("delete")).toBe(false);
  });
});
