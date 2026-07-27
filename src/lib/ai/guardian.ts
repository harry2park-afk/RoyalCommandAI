const LICENSED_PATTERNS = [
  /\b(legal advice|sue|lawsuit|contract binding|will and testament)\b/i,
  /\b(tax advice|file my taxes|deduct|IRS|ATO tax ruling)\b/i,
  /\b(financial advice|buy this stock|investment recommendation|portfolio allocation)\b/i,
  /\b(진단|처방|법률 자문|세무 자문|투자 자문)\b/i,
];

export function guardianCheck(prompt: string): {
  blocked: boolean;
  reason?: string;
  escalation?: string;
} {
  const hit = LICENSED_PATTERNS.find((p) => p.test(prompt));
  if (!hit) return { blocked: false };

  return {
    blocked: true,
    reason:
      "This request appears to seek licensed legal, tax, or financial advice. Royal Household AI assists only; licensed advice must come from verified professionals.",
    escalation:
      "Connect a curated Legal, Accounting, or Financial Advisory Service Fabric to this Room for professional review.",
  };
}
