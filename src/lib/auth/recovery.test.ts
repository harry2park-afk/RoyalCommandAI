import { describe, expect, it } from "vitest";
import { DEFAULT_RECOVERY_PATH, sanitizeRecoveryPath } from "./recovery";

describe("sanitizeRecoveryPath", () => {
  it("accepts the password update route", () => {
    expect(sanitizeRecoveryPath("/update-password")).toBe("/update-password");
  });

  it.each([
    undefined,
    null,
    "",
    "https://evil.example/reset",
    "//evil.example/reset",
    "/dashboard",
    "/update-password?next=https://evil.example",
    "\\\\evil.example\\reset",
  ])("fails closed for unapproved redirect %s", (value) => {
    expect(sanitizeRecoveryPath(value)).toBe(DEFAULT_RECOVERY_PATH);
  });
});
