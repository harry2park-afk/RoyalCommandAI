import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type CountryLegalComplianceResult = {
  verified: boolean;
  error: string | null;
};

const LEGAL_EVIDENCE_COLUMNS = [
  "review_status",
  "reviewed_at",
  "reviewed_by",
  "evidence_ref",
  "evidence_sha256",
  "valid_from",
  "valid_until",
  "superseded_at",
].join(",");

function hasCurrentReviewerProvenLegalEvidence(
  row: Record<string, unknown> | null | undefined,
  now: Date,
) {
  if (!row) return false;
  if (row.review_status !== "VERIFIED") return false;
  if (typeof row.reviewed_by !== "string" || row.reviewed_by.length === 0) return false;
  if (typeof row.reviewed_at !== "string" || row.reviewed_at.length === 0) return false;
  if (typeof row.evidence_ref !== "string" || row.evidence_ref.trim().length === 0) return false;
  if (typeof row.evidence_sha256 !== "string" || !/^[0-9A-Fa-f]{64}$/.test(row.evidence_sha256)) return false;
  if (row.superseded_at !== null && row.superseded_at !== undefined) return false;

  if (typeof row.valid_from === "string" && new Date(row.valid_from) > now) return false;
  if (typeof row.valid_until === "string" && new Date(row.valid_until) <= now) return false;

  return true;
}

/**
 * Reads only the minimum country-wide legal-compliance evidence needed by the
 * server service-activation boundary. The registry intentionally has no
 * anon/authenticated table access, so the service-role key stays encapsulated
 * here rather than broadening RLS/ACLs.
 *
 * This is one legal-compliance hook only. It does not substitute for privacy,
 * recording, tax, data-residency, payment, or country-launch approval gates.
 */
export async function verifyCountryLegalCompliance(
  countryCode: string,
  now = new Date(),
): Promise<CountryLegalComplianceResult> {
  const country = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return { verified: false, error: "invalid_country" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return { verified: false, error: "country_compliance_store_unavailable" };
  }

  const admin = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await admin
    .from("country_compliance_evidence")
    .select(LEGAL_EVIDENCE_COLUMNS)
    .eq("country_code", country)
    .is("subdivision_code", null)
    .eq("evidence_kind", "legal")
    .eq("review_status", "VERIFIED")
    .is("superseded_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { verified: false, error: error.message || "country_compliance_query_failed" };
  }

  return {
    verified: hasCurrentReviewerProvenLegalEvidence(data as Record<string, unknown> | null, now),
    error: null,
  };
}
