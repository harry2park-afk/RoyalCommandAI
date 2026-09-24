import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type CountryComplianceResult = {
  verified: boolean;
  error: string | null;
};

export type CountryServiceComplianceKind = "legal" | "privacy" | "data_residency";

export type CountryServiceComplianceResult = CountryComplianceResult & {
  missingKinds: CountryServiceComplianceKind[];
};

const SERVICE_REQUIRED_EVIDENCE_KINDS: readonly CountryServiceComplianceKind[] = [
  "legal",
  "privacy",
  "data_residency",
] as const;

const EVIDENCE_COLUMNS = [
  "evidence_kind",
  "review_status",
  "reviewed_at",
  "reviewed_by",
  "evidence_ref",
  "evidence_sha256",
  "valid_from",
  "valid_until",
  "superseded_at",
].join(",");

function parseEvidenceDate(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasCurrentReviewerProvenEvidence(
  row: Record<string, unknown> | null | undefined,
  now: Date,
) {
  if (!row) return false;
  if (row.review_status !== "VERIFIED") return false;
  if (typeof row.reviewed_by !== "string" || row.reviewed_by.length === 0) return false;

  const reviewedAt = parseEvidenceDate(row.reviewed_at);
  if (!reviewedAt || reviewedAt > now) return false;

  if (typeof row.evidence_ref !== "string" || row.evidence_ref.trim().length === 0) return false;
  if (typeof row.evidence_sha256 !== "string" || !/^[0-9A-Fa-f]{64}$/.test(row.evidence_sha256)) return false;
  if (row.superseded_at !== null && row.superseded_at !== undefined) return false;

  if (row.valid_from !== null && row.valid_from !== undefined) {
    const validFrom = parseEvidenceDate(row.valid_from);
    if (!validFrom || validFrom > now) return false;
  }

  if (row.valid_until !== null && row.valid_until !== undefined) {
    const validUntil = parseEvidenceDate(row.valid_until);
    if (!validUntil || validUntil <= now) return false;
  }

  return true;
}

function serviceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyCountryEvidenceKinds<TKind extends string>(
  countryCode: string,
  requiredKinds: readonly TKind[],
  now: Date,
): Promise<{ verified: boolean; error: string | null; missingKinds: TKind[] }> {
  const country = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return { verified: false, error: "invalid_country", missingKinds: [...requiredKinds] };
  }

  const admin = serviceRoleClient();
  if (!admin) {
    return {
      verified: false,
      error: "country_compliance_store_unavailable",
      missingKinds: [...requiredKinds],
    };
  }

  const { data, error } = await admin
    .from("country_compliance_evidence")
    .select(EVIDENCE_COLUMNS)
    .eq("country_code", country)
    .is("subdivision_code", null)
    .in("evidence_kind", [...requiredKinds])
    .eq("review_status", "VERIFIED")
    .is("superseded_at", null);

  if (error) {
    return {
      verified: false,
      error: error.message || "country_compliance_query_failed",
      missingKinds: [...requiredKinds],
    };
  }

  const evidenceRows = (data || []) as unknown as Record<string, unknown>[];
  const verifiedKinds = new Set(
    evidenceRows
      .filter((row) => hasCurrentReviewerProvenEvidence(row, now))
      .map((row) => row.evidence_kind)
      .filter((kind): kind is string => typeof kind === "string"),
  );
  const missingKinds = requiredKinds.filter((kind) => !verifiedKinds.has(kind));

  return {
    verified: missingKinds.length === 0,
    error: null,
    missingKinds,
  };
}

/**
 * Reads the minimum country-wide compliance evidence required by the server
 * service-activation boundary. The registry intentionally has no
 * anon/authenticated table access, so the service-role key stays encapsulated
 * here rather than broadening RLS/ACLs.
 *
 * Service activation requires legal, privacy, and data-residency evidence to
 * be independently current and reviewer-proven. Recording/consent, tax,
 * payment, provider, and overall Country READY remain separate gates.
 */
export async function verifyCountryServiceCompliance(
  countryCode: string,
  now = new Date(),
): Promise<CountryServiceComplianceResult> {
  return verifyCountryEvidenceKinds(countryCode, SERVICE_REQUIRED_EVIDENCE_KINDS, now);
}

/**
 * Backward-compatible legal-only reader for callers that intentionally need
 * only the legal evidence dimension. It must not be used as the complete
 * service-activation compliance gate.
 */
export async function verifyCountryLegalCompliance(
  countryCode: string,
  now = new Date(),
): Promise<CountryComplianceResult> {
  const result = await verifyCountryEvidenceKinds(countryCode, ["legal"] as const, now);
  return { verified: result.verified, error: result.error };
}
