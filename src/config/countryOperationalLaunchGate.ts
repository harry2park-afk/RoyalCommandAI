import type { CountryConfig } from "../types/countryConfig";
import { evaluateCountryLaunch, type CountryLaunchGate } from "./countryLaunchGate";
import { evaluateCountryComplianceHookStructure } from "./countryComplianceHookStructure";
import { evaluateCountryLocalizationStructure } from "./countryLocalizationStructure";

export type OperationalEvidenceStatus = "VERIFIED" | "NEEDS_REVIEW" | "BLOCKED";

export type CountryOperationalEvidence = {
  domainBinding: OperationalEvidenceStatus;
  authCallback: OperationalEvidenceStatus;
  sessionCookies: OperationalEvidenceStatus;
  /**
   * Authentication recovery is independent of callback/session setup. Country
   * promotion requires verified reset/recovery delivery and token lifecycle
   * behavior; omitted evidence fails closed at launch time.
   */
  authRecoveryEvidence?: OperationalEvidenceStatus;
  /**
   * Database migration safety is independent of application QA. Launch-critical
   * schema changes require an exact linked migration inventory/dry-run plus
   * controlled Hosted staging/read-back evidence before country promotion.
   * Omitted evidence fails closed at launch time.
   */
  databaseMigrationSafety?: OperationalEvidenceStatus;
  /**
   * Tenant/data isolation is optional at the type boundary for source
   * compatibility, but omitted evidence fails closed at launch time.
   */
  tenantDataIsolation?: OperationalEvidenceStatus;
  /**
   * Matter ownership and staff-assignment authority is independent of broad
   * tenant RLS evidence. A country must not launch while an end-user session can
   * rewrite a Matter's client owner or assigned staff. Omitted evidence fails
   * closed at launch time.
   */
  matterOwnershipAssignmentAuthority?: OperationalEvidenceStatus;
  /**
   * Authorization-role authority is independent of tenant isolation. A tenant
   * can be row-isolated while still being unsafe if an end-user can promote a
   * profile role or signup metadata can mint staff/admin authority. Omitted
   * evidence therefore fails closed at launch time.
   */
  authorizationRoleAuthority?: OperationalEvidenceStatus;
  communicationsRules: OperationalEvidenceStatus;
  /**
   * Country recording/consent rules require explicit human-reviewed evidence.
   * Generic communications readiness cannot substitute for reviewer provenance.
   */
  recordingConsentEvidence?: OperationalEvidenceStatus;
  /**
   * Human-reviewed legal/compliance evidence must exist outside static country
   * configuration before a country can be promoted.
   */
  legalComplianceEvidence?: OperationalEvidenceStatus;
  /**
   * Privacy lifecycle evidence is independent of data-residency configuration.
   * Launch requires reviewed controls for notice/consent, retention/deletion,
   * and data-subject request handling. Omitted evidence fails closed.
   */
  privacyLifecycleEvidence?: OperationalEvidenceStatus;
  dataResidency: OperationalEvidenceStatus;
  localization: OperationalEvidenceStatus;
  requiredIntegrations: OperationalEvidenceStatus;
  /**
   * Commercial readiness is separate from payment connectivity. Country terms,
   * positive local pricing, and a reviewed/available provider offer must be
   * verified before a country can be promoted. Omitted evidence fails closed.
   */
  commercialReadiness?: OperationalEvidenceStatus;
  /**
   * Room Factory/template readiness is optional at the type boundary so older
   * callers remain source-compatible, but the launch gate treats missing
   * evidence exactly like unverified evidence and therefore fails closed.
   */
  roomFactoryTemplate?: OperationalEvidenceStatus;
  /**
   * A connected payment configuration is not sufficient by itself. Operational
   * payment evidence covers the launch path such as sandbox/provider handling,
   * webhook/idempotency controls, and cancellation/refund readiness.
   */
  paymentOperations?: OperationalEvidenceStatus;
  /**
   * Production observability and incident response are independent of build QA.
   * Country promotion requires trusted telemetry, alert/triage ownership, and a
   * verified incident handling path. Omitted evidence fails closed so a green
   * build cannot substitute for operational detection and response readiness.
   */
  observabilityIncidentResponse?: OperationalEvidenceStatus;
  /**
   * Launch promotion requires exact-head QA/security/regression evidence rather
   * than relying on a preview smoke test alone. Omitted evidence fails closed.
   */
  qaSecurityRegression?: OperationalEvidenceStatus;
  previewSmokeTest: OperationalEvidenceStatus;
  /**
   * Safe deployment evidence covers the protected promotion path, including
   * required checks and branch/ruleset enforcement. Omitted evidence fails
   * closed even when Preview and rollback checks are otherwise verified.
   */
  deploymentProtection?: OperationalEvidenceStatus;
  rollbackPath: OperationalEvidenceStatus;
};

export type CountryOperationalBlockerCode =
  | "DOMAIN_BINDING_NOT_VERIFIED"
  | "AUTH_CALLBACK_NOT_VERIFIED"
  | "SESSION_COOKIES_NOT_VERIFIED"
  | "AUTH_RECOVERY_EVIDENCE_NOT_VERIFIED"
  | "DATABASE_MIGRATION_SAFETY_NOT_VERIFIED"
  | "TENANT_DATA_ISOLATION_NOT_VERIFIED"
  | "MATTER_OWNERSHIP_ASSIGNMENT_AUTHORITY_NOT_VERIFIED"
  | "AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED"
  | "COMMUNICATIONS_RULES_NOT_VERIFIED"
  | "RECORDING_CONSENT_EVIDENCE_NOT_VERIFIED"
  | "LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED"
  | "PRIVACY_LIFECYCLE_EVIDENCE_NOT_VERIFIED"
  | "DATA_RESIDENCY_NOT_VERIFIED"
  | "LOCALIZATION_NOT_VERIFIED"
  | "LOCALIZATION_STRUCTURE_NOT_READY"
  | "COMPLIANCE_HOOK_STRUCTURE_NOT_READY"
  | "REQUIRED_INTEGRATIONS_NOT_VERIFIED"
  | "COMMERCIAL_READINESS_NOT_VERIFIED"
  | "ROOM_FACTORY_TEMPLATE_NOT_VERIFIED"
  | "PAYMENT_OPERATIONS_NOT_VERIFIED"
  | "OBSERVABILITY_INCIDENT_RESPONSE_NOT_VERIFIED"
  | "QA_SECURITY_REGRESSION_NOT_VERIFIED"
  | "PREVIEW_SMOKE_TEST_NOT_VERIFIED"
  | "DEPLOYMENT_PROTECTION_NOT_VERIFIED"
  | "ROLLBACK_PATH_NOT_VERIFIED";

export type CountryOperationalLaunchGate = {
  launchable: boolean;
  countryGate: CountryLaunchGate;
  operationalBlockers: CountryOperationalBlockerCode[];
};

const OPERATIONAL_REQUIREMENTS: ReadonlyArray<{
  key: keyof CountryOperationalEvidence;
  blocker: CountryOperationalBlockerCode;
}> = [
  { key: "domainBinding", blocker: "DOMAIN_BINDING_NOT_VERIFIED" },
  { key: "authCallback", blocker: "AUTH_CALLBACK_NOT_VERIFIED" },
  { key: "sessionCookies", blocker: "SESSION_COOKIES_NOT_VERIFIED" },
  { key: "authRecoveryEvidence", blocker: "AUTH_RECOVERY_EVIDENCE_NOT_VERIFIED" },
  { key: "databaseMigrationSafety", blocker: "DATABASE_MIGRATION_SAFETY_NOT_VERIFIED" },
  { key: "tenantDataIsolation", blocker: "TENANT_DATA_ISOLATION_NOT_VERIFIED" },
  {
    key: "matterOwnershipAssignmentAuthority",
    blocker: "MATTER_OWNERSHIP_ASSIGNMENT_AUTHORITY_NOT_VERIFIED",
  },
  { key: "authorizationRoleAuthority", blocker: "AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED" },
  { key: "communicationsRules", blocker: "COMMUNICATIONS_RULES_NOT_VERIFIED" },
  { key: "recordingConsentEvidence", blocker: "RECORDING_CONSENT_EVIDENCE_NOT_VERIFIED" },
  { key: "legalComplianceEvidence", blocker: "LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED" },
  { key: "privacyLifecycleEvidence", blocker: "PRIVACY_LIFECYCLE_EVIDENCE_NOT_VERIFIED" },
  { key: "dataResidency", blocker: "DATA_RESIDENCY_NOT_VERIFIED" },
  { key: "localization", blocker: "LOCALIZATION_NOT_VERIFIED" },
  { key: "requiredIntegrations", blocker: "REQUIRED_INTEGRATIONS_NOT_VERIFIED" },
  { key: "commercialReadiness", blocker: "COMMERCIAL_READINESS_NOT_VERIFIED" },
  { key: "roomFactoryTemplate", blocker: "ROOM_FACTORY_TEMPLATE_NOT_VERIFIED" },
  { key: "paymentOperations", blocker: "PAYMENT_OPERATIONS_NOT_VERIFIED" },
  {
    key: "observabilityIncidentResponse",
    blocker: "OBSERVABILITY_INCIDENT_RESPONSE_NOT_VERIFIED",
  },
  { key: "qaSecurityRegression", blocker: "QA_SECURITY_REGRESSION_NOT_VERIFIED" },
  { key: "previewSmokeTest", blocker: "PREVIEW_SMOKE_TEST_NOT_VERIFIED" },
  { key: "deploymentProtection", blocker: "DEPLOYMENT_PROTECTION_NOT_VERIFIED" },
  { key: "rollbackPath", blocker: "ROLLBACK_PATH_NOT_VERIFIED" },
] as const;

/**
 * Second-stage country activation gate.
 *
 * The existing country launch gate covers configured legal/tax/payment status.
 * This gate adds the operational evidence required by the 100-country
 * onboarding contract without changing any existing production routing or
 * activation. Every item fails closed until evidence is explicitly VERIFIED,
 * including authentication recovery, exact linked database migration safety,
 * tenant isolation, Matter ownership/assignment authority, authorization-role
 * authority, reviewed recording/consent evidence, external legal/compliance and
 * privacy-lifecycle evidence, commercial terms/pricing/provider readiness, Room
 * Factory readiness, operational payment safeguards, trusted observability and
 * incident response, exact-head QA/security evidence, structurally wired country
 * compliance hooks, a structurally compatible country localization path, and a
 * protected deployment path.
 */
export function evaluateCountryOperationalLaunch(
  config: CountryConfig,
  evidence: CountryOperationalEvidence,
): CountryOperationalLaunchGate {
  const countryGate = evaluateCountryLaunch(config);
  const localizationStructure = evaluateCountryLocalizationStructure(config);
  const complianceHookStructure = evaluateCountryComplianceHookStructure(config);
  const operationalBlockers = OPERATIONAL_REQUIREMENTS
    .filter(({ key }) => evidence[key] !== "VERIFIED")
    .map(({ blocker }) => blocker);

  if (!localizationStructure.ready) {
    operationalBlockers.push("LOCALIZATION_STRUCTURE_NOT_READY");
  }

  if (!complianceHookStructure.ready) {
    operationalBlockers.push("COMPLIANCE_HOOK_STRUCTURE_NOT_READY");
  }

  return {
    launchable: countryGate.launchable && operationalBlockers.length === 0,
    countryGate,
    operationalBlockers,
  };
}
