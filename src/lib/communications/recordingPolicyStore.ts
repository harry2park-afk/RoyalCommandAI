import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type StoredRecordingPolicyRow = {
  country_code: string;
  region_code: string | null;
  review_status: string;
  recording_policy: string;
};

export type RecordingPolicyStoreResult = {
  rows: StoredRecordingPolicyRow[];
  error: string | null;
};

const POLICY_COLUMNS = "country_code, region_code, review_status, recording_policy";

/**
 * Reads the minimum recording-policy fields required by the trusted server runtime.
 *
 * The underlying table is intentionally inaccessible to anon/authenticated roles.
 * Keep the service-role client encapsulated here so callers cannot use it for general
 * database access, and return no internal legal/reviewer metadata.
 */
export async function loadRecordingPolicyRows(countryCode: string): Promise<RecordingPolicyStoreResult> {
  const country = countryCode.trim().toUpperCase();
  if (!country) return { rows: [], error: "missing_country" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return { rows: [], error: "recording_policy_store_unavailable" };
  }

  const admin = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await admin
    .from("communication_recording_policies")
    .select(POLICY_COLUMNS)
    .eq("country_code", country);

  if (error) {
    return { rows: [], error: error.message || "recording_policy_query_failed" };
  }

  return {
    rows: (data || []).map((row) => ({
      country_code: String(row.country_code || "").toUpperCase(),
      region_code: row.region_code ? String(row.region_code).toUpperCase() : null,
      review_status: String(row.review_status || ""),
      recording_policy: String(row.recording_policy || ""),
    })),
    error: null,
  };
}
