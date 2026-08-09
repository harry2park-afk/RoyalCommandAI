export type RequirementLevel = "core" | "often" | "product-specific";

export type BankRequirement = {
  id: string;
  label: string;
  level: RequirementLevel;
  note?: string;
};

export type AustralianBankProfile = {
  id: string;
  name: string;
  shortName: string;
  coverage: "major-bank" | "generic";
  requirements: BankRequirement[];
  sourceLabel: string;
  sourceUrl: string;
  lastVerified: string;
  note: string;
};

export const UNIVERSAL_REQUIREMENTS: BankRequirement[] = [
  { id: "identity", label: "Identification for applicant, directors, partners and guarantors", level: "core" },
  { id: "business-registration", label: "ABN / ACN, entity structure, ownership and business registration details", level: "core" },
  { id: "financial-statements", label: "Business financial statements including Profit & Loss and Balance Sheet", level: "core" },
  { id: "cash-flow", label: "Cash-flow statement and forecast", level: "often" },
  { id: "tax", label: "Business tax returns, BAS and/or ATO account records", level: "core" },
  { id: "bank-statements", label: "Recent business bank statements / transaction history", level: "core" },
  { id: "liabilities", label: "Existing loans, cards, leases, tax debt and other liabilities", level: "core" },
  { id: "personal-position", label: "Personal income, assets, liabilities and tax records where relevant", level: "often" },
  { id: "business-plan", label: "Business plan, purpose of finance and use-of-funds plan", level: "often" },
  { id: "security", label: "Assets, collateral, guarantees and security information where applicable", level: "product-specific" },
  { id: "contracts", label: "Material contracts, leases, sale agreements or evidence of recurring revenue where relevant", level: "product-specific" },
  { id: "ip", label: "Patents, trademarks, software, licences and other IP where relevant to business value/security", level: "product-specific" },
];

function withUniversal(extra: BankRequirement[]) {
  const map = new Map<string, BankRequirement>();
  [...UNIVERSAL_REQUIREMENTS, ...extra].forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export const AUSTRALIAN_BANKS: AustralianBankProfile[] = [
  {
    id: "generic-au",
    name: "Any Australian Bank / Lender",
    shortName: "Any Australian Bank",
    coverage: "generic",
    requirements: UNIVERSAL_REQUIREMENTS,
    sourceLabel: "Royal Command universal Australian bank pack",
    sourceUrl: "https://business.gov.au/finance/funding/apply-for-a-business-loan",
    lastVerified: "2026-08-10",
    note: "Use this as the base pack. Product and lender-specific requirements are added on top; this is not an approval guarantee.",
  },
  {
    id: "commbank",
    name: "Commonwealth Bank of Australia",
    shortName: "CommBank",
    coverage: "major-bank",
    requirements: withUniversal([
      { id: "financial-statements", label: "Financial statements, preferably accountant-prepared, generally including Balance Sheet and Income Statement", level: "core" },
      { id: "personal-position", label: "Proof of individual income and personal financial position for relevant directors/shareholders", level: "often" },
      { id: "ato-accounts", label: "ATO income-tax and activity-statement account PDFs where requested", level: "often" },
      { id: "startup", label: "Additional information for start-up businesses", level: "product-specific" },
    ]),
    sourceLabel: "CommBank — What do you need to apply for a business loan?",
    sourceUrl: "https://www.commbank.com.au/business/articles/information-for-business-loan.html",
    lastVerified: "2026-08-10",
    note: "CommBank states applicants may be asked for financial statements, individual income evidence, bank statements, identification and additional start-up information.",
  },
  {
    id: "nab",
    name: "National Australia Bank",
    shortName: "NAB",
    coverage: "major-bank",
    requirements: withUniversal([
      { id: "financial-statements", label: "Annual financial statements — commonly the last two years, including Balance Sheet and Income Statement", level: "core" },
      { id: "ato-accounts", label: "Latest full ATO tax portal report / relevant ATO account documents", level: "core" },
      { id: "personal-position", label: "Recent individual tax returns, Notice of Assessment, assets/liabilities and other income where relevant", level: "often" },
      { id: "management-financials", label: "Interim management financials, BAS and cash-flow projections for start-ups or complex applications", level: "product-specific" },
      { id: "contracts", label: "Business sale contract or lease agreements where relevant", level: "product-specific" },
    ]),
    sourceLabel: "NAB — Documents you need to apply for business finance",
    sourceUrl: "https://www.nab.com.au/business/small-business/moments/starting-out/buy-business/apply-finance",
    lastVerified: "2026-08-10",
    note: "NAB says documentation varies by circumstances and may include additional material for start-ups or complex businesses.",
  },
  {
    id: "westpac",
    name: "Westpac Banking Corporation",
    shortName: "Westpac",
    coverage: "major-bank",
    requirements: withUniversal([
      { id: "financial-statements", label: "Profit & Loss, Balance Sheet and/or cash-flow statements", level: "core" },
      { id: "tax", label: "Business tax returns — Westpac notes lenders may ask for the past two or three years", level: "often" },
      { id: "bank-statements", label: "Business account statements — Westpac notes six to twelve months may be requested", level: "often" },
      { id: "business-plan", label: "Business plan covering goals, strategy, market, products/services and projections", level: "often" },
      { id: "business-credit", label: "Business credit report / credit history information", level: "often" },
      { id: "security", label: "Collateral details where the facility is secured", level: "product-specific" },
    ]),
    sourceLabel: "Westpac — Applying for a business loan",
    sourceUrl: "https://www.westpac.com.au/business-banking/loans-finance/business-loan/applying-for-a-business-loan/",
    lastVerified: "2026-08-10",
    note: "Westpac describes common documentation but exact requirements depend on the facility and applicant.",
  },
  {
    id: "anz",
    name: "Australia and New Zealand Banking Group",
    shortName: "ANZ",
    coverage: "major-bank",
    requirements: withUniversal([
      { id: "accounting-connection", label: "For eligible ANZ GoBiz applications, encrypted one-time accounting-software or existing ANZ account data connection may be used", level: "product-specific" },
      { id: "business-history", label: "Business operating and financial history sufficient for the selected lending product", level: "core" },
      { id: "security", label: "Security information is product-dependent; some ANZ GoBiz facilities are unsecured", level: "product-specific" },
    ]),
    sourceLabel: "ANZ — GoBiz online business lending",
    sourceUrl: "https://www.anz.com.au/business/loans-finance/online-business-lending/",
    lastVerified: "2026-08-10",
    note: "ANZ GoBiz can use an encrypted one-time accounting connection or existing ANZ account data for eligible online applications. Other ANZ business facilities can require different information.",
  },
];

export function getAustralianBank(id: string) {
  return AUSTRALIAN_BANKS.find((bank) => bank.id === id) || AUSTRALIAN_BANKS[0];
}

export function getBankRequirements(id: string) {
  return getAustralianBank(id).requirements;
}

export type CdrConnectionMode = "not-configured" | "representative" | "accredited-recipient";

export type CdrRuntimeStatus = {
  mode: CdrConnectionMode;
  configured: boolean;
  providerName: string | null;
  consentDashboardReady: boolean;
  liveBankDataEnabled: boolean;
  message: string;
};

export function getCdrRuntimeStatus(): CdrRuntimeStatus {
  const mode = (process.env.CDR_CONNECTION_MODE || "not-configured") as CdrConnectionMode;
  const providerName = process.env.CDR_PROVIDER_NAME || null;
  const representativeConfigured =
    mode === "representative" &&
    Boolean(process.env.CDR_PROVIDER_NAME) &&
    Boolean(process.env.CDR_PROVIDER_CLIENT_ID);
  const adrConfigured =
    mode === "accredited-recipient" &&
    Boolean(process.env.CDR_ACCREDITATION_NUMBER) &&
    Boolean(process.env.CDR_PROVIDER_CLIENT_ID);
  const configured = representativeConfigured || adrConfigured;

  return {
    mode,
    configured,
    providerName,
    consentDashboardReady: true,
    liveBankDataEnabled: configured,
    message: configured
      ? "CDR integration credentials are configured. Provider-specific authorisation and conformance testing are still required before production use."
      : "Live CDR is intentionally disabled until Royal Command has an approved CDR participation pathway and provider credentials.",
  };
}
