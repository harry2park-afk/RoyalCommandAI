import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseClient: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createSupabaseClient,
}));

import { verifyCountryLegalCompliance } from "./countryComplianceStore";

function queryBuilder(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

describe("country compliance server store", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-test-key";
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;

    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });

  it("fails closed when the server-only service role configuration is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(verifyCountryLegalCompliance("AU")).resolves.toEqual({
      verified: false,
      error: "country_compliance_store_unavailable",
    });
    expect(mocks.createSupabaseClient).not.toHaveBeenCalled();
  });

  it("accepts only current reviewer-proven country-wide VERIFIED legal evidence", async () => {
    const query = queryBuilder({
      data: {
        review_status: "VERIFIED",
        reviewed_at: "2026-09-20T00:00:00.000Z",
        reviewed_by: "11111111-1111-4111-8111-111111111111",
        evidence_ref: "legal-review/AU/v1",
        evidence_sha256: "a".repeat(64),
        valid_from: "2026-09-01T00:00:00.000Z",
        valid_until: "2026-12-01T00:00:00.000Z",
        superseded_at: null,
      },
      error: null,
    });
    mocks.from.mockReturnValue(query);
    mocks.createSupabaseClient.mockReturnValue({ from: mocks.from });

    await expect(verifyCountryLegalCompliance("au", new Date("2026-09-22T08:00:00.000Z"))).resolves.toEqual({
      verified: true,
      error: null,
    });

    expect(mocks.createSupabaseClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "server-only-test-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    expect(mocks.from).toHaveBeenCalledWith("country_compliance_evidence");
    expect(query.eq).toHaveBeenCalledWith("country_code", "AU");
    expect(query.eq).toHaveBeenCalledWith("evidence_kind", "legal");
    expect(query.eq).toHaveBeenCalledWith("review_status", "VERIFIED");
    expect(query.is).toHaveBeenCalledWith("subdivision_code", null);
    expect(query.is).toHaveBeenCalledWith("superseded_at", null);
  });

  it("fails closed when verified evidence is expired", async () => {
    const query = queryBuilder({
      data: {
        review_status: "VERIFIED",
        reviewed_at: "2026-09-01T00:00:00.000Z",
        reviewed_by: "11111111-1111-4111-8111-111111111111",
        evidence_ref: "legal-review/AU/v1",
        evidence_sha256: "b".repeat(64),
        valid_from: "2026-09-01T00:00:00.000Z",
        valid_until: "2026-09-20T00:00:00.000Z",
        superseded_at: null,
      },
      error: null,
    });
    mocks.from.mockReturnValue(query);
    mocks.createSupabaseClient.mockReturnValue({ from: mocks.from });

    await expect(verifyCountryLegalCompliance("AU", new Date("2026-09-22T08:00:00.000Z"))).resolves.toEqual({
      verified: false,
      error: null,
    });
  });

  it("fails closed on database errors", async () => {
    const query = queryBuilder({ data: null, error: { message: "registry unavailable" } });
    mocks.from.mockReturnValue(query);
    mocks.createSupabaseClient.mockReturnValue({ from: mocks.from });

    await expect(verifyCountryLegalCompliance("AU")).resolves.toEqual({
      verified: false,
      error: "registry unavailable",
    });
  });
});
