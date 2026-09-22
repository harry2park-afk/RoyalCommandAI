import { describe, expect, it } from "vitest";
import { hasReviewerProvenCountryApproval } from "./service-country-commercial-readiness";

const now = new Date("2026-09-22T12:00:00.000Z");

function approvedTerm(overrides: Record<string, unknown> = {}) {
  return {
    availability_status: "available",
    review_status: "approved",
    reviewed_by: "33333333-3333-4333-8333-333333333333",
    reviewed_at: "2026-09-22T11:00:00.000Z",
    ...overrides,
  };
}

describe("country service commercial review provenance", () => {
  it("accepts a reviewer-proven approval with a valid non-future timestamp", () => {
    expect(hasReviewerProvenCountryApproval(approvedTerm(), now)).toBe(true);
  });

  it("rejects missing or blank reviewer provenance", () => {
    expect(hasReviewerProvenCountryApproval(approvedTerm({ reviewed_by: null }), now)).toBe(false);
    expect(hasReviewerProvenCountryApproval(approvedTerm({ reviewed_by: "   " }), now)).toBe(false);
  });

  it("rejects malformed review timestamps", () => {
    expect(hasReviewerProvenCountryApproval(approvedTerm({ reviewed_at: "not-a-date" }), now)).toBe(false);
  });

  it("rejects future-dated approvals", () => {
    expect(hasReviewerProvenCountryApproval(
      approvedTerm({ reviewed_at: "2026-09-22T12:00:00.001Z" }),
      now,
    )).toBe(false);
  });

  it("rejects rows that are not both available and approved", () => {
    expect(hasReviewerProvenCountryApproval(approvedTerm({ availability_status: "blocked" }), now)).toBe(false);
    expect(hasReviewerProvenCountryApproval(approvedTerm({ review_status: "needs_review" }), now)).toBe(false);
  });
});
