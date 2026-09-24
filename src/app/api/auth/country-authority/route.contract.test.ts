import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("country authority route security contract", () => {
  it("keeps the service-role mutation behind all fail-closed gates", () => {
    expect(source).toContain("isCountryAuthorityEnabled()");
    expect(source).toContain("isCountryAuthorityAdmin(actor.id)");
    expect(source).toContain("verifyStepUpToken(");
    expect(source).toContain("requestedCountryMatchesAssignment(");
    expect(source).toContain("admin.auth.admin.getUserById(");
    expect(source).toContain("admin.auth.admin.updateUserById(");
    expect(source).toContain("country_code: parsed.data.countryCode");
  });

  it("does not trust profiles.role for country assignment", () => {
    expect(source).not.toContain('.from("profiles")');
    expect(source).not.toContain("profiles.role");
  });
});
