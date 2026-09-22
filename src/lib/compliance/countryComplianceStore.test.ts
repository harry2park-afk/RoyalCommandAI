import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseClient: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createSupabaseClient,
}));

import { verifyCountryLegalCompliance, verifyCountryServiceCompliance } from "./countryComplianceStore";

function evidence(kind: "legal" | "privacy" | "data_residency", overrides: Record<string, unknown> = {}) {
  return {
    evidence_kind: kind,
    review_status: "VERIFIED",
    reviewed_at: "2026-09-20T00:00:00.000Z",
    reviewed_by: "11111111-1111-4111-8111-111111111111",
    evidence_ref: `${kind}-review/AU/v1`,
    evidence_sha256: "a".repeat(64),
    valid_from: "2026-09-01T00:00:00.000Z",
    valid_until: "2026-12-01T00:00:00.000Z",
    superseded_at: null,
    ...overrides,
  };
}

function queryBuilder(result: { data: unknown; error: unknown }) {
  return {
    ...result,
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
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

    await expect(verifyCountryServiceCompliance("AU")).resolves.toEqual({
      verified: false,
      error: "country_compliance_store_unavailable",
      missingKinds: ["legal", "privacy", "data_residency"],
    });
    expect(mocks.createSupabaseClient).not.toHaveBeenCalled();
  });

  it("requires current reviewer-proven legal, privacy, and data-residency evidence", async () => {
    const query = queryBuilder({
      data: [evidence("legal"), evidence("privacy"), evidence("data_residency")],
      error: null,
    });
    mocks.from.mockReturnValue(query);
    mocks.createSupabaseClient.mockReturnValue({ from: mocks.from });

    await expect(verifyCountryServiceCompliance("au", new Date("2026-09-22T08:00:00.000Z"))).resolves.toEqual({
      verified: true,
      error: null,
      missingKinds: [],
    });

    expect(mocks.createSupabaseClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "server-only-test-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    expect(mocks.from).toHaveBeenCalledWith("country_compliance_evidence");
    expect(query.eq).toHaveBeenCalledWith("country_code", "AU");
    expect(query.in).toHaveBeenCalledWith("evidence_kind", ["legal", "privacy", "data_residency"]);
    expect(query.eq).toHaveBeenCalledWith("review_status", "VERIFIED");
    expect(query.is).toHaveBeenCalledWith("subdivision_code", null);
    expect(query.is).toHaveBeenCalledWith("superseded_at", null);
  });

  it("fails closed when privacy evidence is missing", async () => {
    const query = queryBuilder({
      data: [evidence("legal"), evidence("data_residency")],
      error: null,
    });
    mocks.from.mockReturnValue(query);
    mocks.createSupabaseClient.mockReturnValue({ from: mocks.from });

    await expect(verifyCountryServiceCompliance("AU", new Date("2026-09-22T08:00:00.000Z"))).resolves.toEqual({
      verified: false,
      error: null,
      missingKinds: ["privacy"],
    });
  });

  it("fails closed when reviewer chronology is from the future", async () => {
    const query = queryBuilder({
      data: [
        evidence("legal", { reviewed_at: "2026-09-23T00:00:00.000Z" }),
        evidence("privacy"),
        evidence("data_residency"),
      ],
      error: null,
    });
    mocks.from.mockReturnValue(query);
    mocks.createSupabaseClient.mockReturnValue({ from: mocks.from });

    await expect(verifyCountryServiceCompliance("AU", new Date("2026-09-22T08:00:00.000Z"))).resolves.toEqual({
      verified: false,
      error: null,
      missingKinds: ["legal"],
    });
  });

  it("fails closed when verified data-residency evidence is expired", async () => {
    const query = queryBuilder({
      data: [
        evidence("legal"),
        evidence("privacy"),
        evidence("data_residency", { valid_until: "2026-09-20T00:00:00.000Z" }),
      ],
      error: null,
    });
    mocks.from.mockReturnValue(query);
    mocks.createSupabaseClient.mockReturnValue({ from: mocks.from });

    await expect(verifyCountryServiceCompliance("AU", new Date("2026-09-22T08:00:00.000Z"))).resolves.toEqual({
      verified: false,
      error: null,
      missingKinds: ["data_residency"],
    });
  });

  it("keeps the legal-only reader for intentionally narrow callers", async () => {
    const query = queryBuilder({ data: [evidence("legal")], error: null });
    mocks.from.mockReturnValue(query);
    mocks.createSupabaseClient.mockReturnValue({ from: mocks.from });

    await expect(verifyCountryLegalCompliance("AU", new Date("2026-09-22T08:00:00.000Z"))).resolves.toEqual({
      verified: true,
      error: null,
    });
    expect(query.in).toHaveBeenCalledWith("evidence_kind", ["legal"]);
  });

  it("fails closed on database errors", async () => {
    const query = queryBuilder({ data: null, error: { message: "registry unavailable" } });
    mocks.from.mockReturnValue(query);
    mocks.createSupabaseClient.mockReturnValue({ from: mocks.from });

    await expect(verifyCountryServiceCompliance("AU")).resolves.toEqual({
      verified: false,
      error: "registry unavailable",
      missingKinds: ["legal", "privacy", "data_residency"],
    });
  });
});
