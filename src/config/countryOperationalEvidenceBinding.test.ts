import { describe, expect, it } from "vitest";
import {
  evaluateCountryOperationalEvidenceBinding,
  type CountryOperationalEvidenceEnvelope,
} from "./countryOperationalEvidenceBinding";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const EXACT_HEAD = "fa398d701d8059df403f581d6c646e769dc23e65";

function envelope(countryCode: string): CountryOperationalEvidenceEnvelope {
  return {
    countryCode,
    exactHeadSha: EXACT_HEAD,
    evidenceId: `october-launch-${countryCode.toLowerCase()}-evidence`,
    capturedAtUtc: "2026-09-11T06:55:00Z",
  };
}

describe("country operational evidence binding", () => {
  it("accepts a complete exact-head envelope only for its own first-wave country", () => {
    for (const countryCode of FIRST_WAVE) {
      expect(evaluateCountryOperationalEvidenceBinding(countryCode, envelope(countryCode))).toEqual({
        ready: true,
        blockers: [],
      });
    }
  });

  it("rejects cross-country evidence reuse", () => {
    expect(evaluateCountryOperationalEvidenceBinding("US", envelope("AU"))).toEqual({
      ready: false,
      blockers: ["COUNTRY_EVIDENCE_COUNTRY_MISMATCH"],
    });
  });

  it("fails closed when the evidence envelope is missing", () => {
    expect(evaluateCountryOperationalEvidenceBinding("AU", null)).toEqual({
      ready: false,
      blockers: [
        "COUNTRY_EVIDENCE_COUNTRY_MISSING",
        "COUNTRY_EVIDENCE_HEAD_SHA_INVALID",
        "COUNTRY_EVIDENCE_ID_MISSING",
        "COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID",
      ],
    });
  });

  it("rejects branch labels, empty evidence ids and timestamps without explicit UTC", () => {
    expect(
      evaluateCountryOperationalEvidenceBinding("AU", {
        countryCode: "AU",
        exactHeadSha: "launch/room-factory-operational-gate-20260907",
        evidenceId: " ",
        capturedAtUtc: "2026-09-11T16:55:00+10:00",
      }),
    ).toEqual({
      ready: false,
      blockers: [
        "COUNTRY_EVIDENCE_HEAD_SHA_INVALID",
        "COUNTRY_EVIDENCE_ID_MISSING",
        "COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID",
      ],
    });
  });
});
