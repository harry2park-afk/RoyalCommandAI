export type CountryServiceCommercialTerm = {
  availability_status?: string | null;
  review_status?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};

/**
 * Country service availability is launch-authoritative only when a human review
 * exists and its timestamp is a real, non-future instant. The database schema
 * records reviewer provenance, but runtime still fails closed on malformed or
 * future-dated values so a bad seed/import cannot activate a service.
 */
export function hasReviewerProvenCountryApproval(
  countryTerm: CountryServiceCommercialTerm | null | undefined,
  now = new Date(),
) {
  if (
    countryTerm?.availability_status !== "available"
    || countryTerm.review_status !== "approved"
    || typeof countryTerm.reviewed_by !== "string"
    || countryTerm.reviewed_by.trim().length === 0
    || typeof countryTerm.reviewed_at !== "string"
    || countryTerm.reviewed_at.trim().length === 0
  ) {
    return false;
  }

  const reviewedAtMs = Date.parse(countryTerm.reviewed_at);
  return Number.isFinite(reviewedAtMs) && reviewedAtMs <= now.getTime();
}
