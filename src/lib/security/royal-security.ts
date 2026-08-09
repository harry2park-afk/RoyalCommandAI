export type SecurityControl = {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "standard";
  status: "planned" | "required" | "active";
  userFriction: "invisible" | "low" | "step-up-only";
};

export type SecurityPolicyVersion = {
  version: string;
  effectiveDate: string;
  reviewCadenceDays: number;
  emergencyUpdateAllowed: boolean;
  rollbackAllowed: boolean;
  notes: string;
};

export const SECURITY_POLICY_VERSION: SecurityPolicyVersion = {
  version: "2026.08.10-1",
  effectiveDate: "2026-08-10",
  reviewCadenceDays: 30,
  emergencyUpdateAllowed: true,
  rollbackAllowed: true,
  notes:
    "Security controls are designed to be centrally updateable without redesigning customer Rooms. Critical fixes may be deployed immediately; routine changes are versioned and reversible.",
};

export const SECURITY_UX_POLICY = {
  principle: "Strong security, minimal interruption",
  defaultAuthentication: "passkey",
  rememberTrustedDevice: true,
  trustedDeviceDays: 30,
  silentRiskChecks: true,
  stepUpOnlyForSensitiveActions: true,
  avoidRepeatedPromptsWhenRiskIsLow: true,
  allowAccessibleFallback: true,
  customerFacingLanguage: "plain-language",
  examplesOfStepUpActions: [
    "Connect or disconnect a bank",
    "Export financial or health records",
    "Share a Room with a professional",
    "Change payment or recovery details",
    "Change administrator permissions",
    "Approve high-risk financial actions",
  ],
};

export const SECURITY_UPDATE_POLICY = {
  centralPolicyDriven: true,
  perRoomOverrideAllowed: true,
  minimumSecurityCannotBeReducedByRoom: true,
  stagedRollout: true,
  emergencyKillSwitch: true,
  securityHeadersUpdateable: true,
  sessionRulesUpdateable: true,
  stepUpRulesUpdateable: true,
  providerAllowListUpdateable: true,
  dependencyPatchTracking: true,
  auditEveryPolicyChange: true,
  requireChangeReason: true,
  requireVersionNumber: true,
  rollbackSupported: true,
};

export const SECURITY_CONTROLS: SecurityControl[] = [
  {
    id: "passkeys",
    title: "Passkeys / phishing-resistant MFA",
    description: "Use WebAuthn/passkeys as the preferred customer authentication method for sensitive Rooms. Device biometrics or a PIN unlock the local cryptographic credential; Royal Command does not need the face or fingerprint data.",
    priority: "critical",
    status: "required",
    userFriction: "low",
  },
  {
    id: "trusted-device",
    title: "Trusted-device convenience",
    description: "After strong verification on a normal trusted device, avoid unnecessary repeated login prompts while continuing silent risk checks in the background.",
    priority: "high",
    status: "required",
    userFriction: "invisible",
  },
  {
    id: "step-up",
    title: "Step-up authentication for sensitive actions",
    description: "Require fresh user verification only before bank connections, financial-data export, payment changes, professional sharing, identity changes, password/passkey recovery or other high-risk actions.",
    priority: "critical",
    status: "required",
    userFriction: "step-up-only",
  },
  {
    id: "adaptive-risk",
    title: "Adaptive risk checks",
    description: "Evaluate device, session, unusual access and security signals silently. Increase authentication only when risk rises instead of interrupting every normal action.",
    priority: "high",
    status: "required",
    userFriction: "invisible",
  },
  {
    id: "room-isolation",
    title: "Customer Room isolation",
    description: "Enforce server-side tenant and Room boundaries so one customer's data, documents, agents and financial records cannot be accessed from another Room.",
    priority: "critical",
    status: "required",
    userFriction: "invisible",
  },
  {
    id: "least-privilege",
    title: "Least-privilege permissions",
    description: "Every agent, employee, professional and integration receives only the minimum permissions required for the approved task and duration.",
    priority: "critical",
    status: "required",
    userFriction: "invisible",
  },
  {
    id: "encryption",
    title: "Encryption and secret separation",
    description: "Encrypt sensitive data in transit and at rest. Keep production secrets, provider tokens and customer financial credentials out of client-side code and out of ordinary logs.",
    priority: "critical",
    status: "required",
    userFriction: "invisible",
  },
  {
    id: "audit",
    title: "Tamper-resistant security audit trail",
    description: "Record successful and failed authentication, permission changes, exports, bank-data access and administrator actions, with central monitoring and protected retention.",
    priority: "high",
    status: "required",
    userFriction: "invisible",
  },
  {
    id: "session-risk",
    title: "Risk-aware sessions",
    description: "Use inactivity timeout, new-device alerts, suspicious-session revocation and re-authentication after meaningful risk changes while keeping ordinary low-risk sessions convenient.",
    priority: "high",
    status: "required",
    userFriction: "low",
  },
  {
    id: "biometric-local",
    title: "Device-local face / fingerprint verification",
    description: "Prefer Face ID, Windows Hello, Android biometrics or equivalent only through the device authenticator/passkey. Do not continuously upload, store or centrally match customers' face images or biometric templates.",
    priority: "critical",
    status: "required",
    userFriction: "low",
  },
  {
    id: "continuous-presence",
    title: "Continuous-presence protection without surveillance",
    description: "For high-security use, rely on device lock, session timeout, presence re-checks and step-up passkey prompts. Continuous camera-based facial surveillance is not the default security mechanism.",
    priority: "high",
    status: "required",
    userFriction: "low",
  },
  {
    id: "privacy-impact",
    title: "Biometric Privacy Impact Assessment",
    description: "Any future Royal Command-controlled facial recognition feature must be opt-in, purpose-limited and independently privacy-reviewed before collection because biometric templates are sensitive information in Australia.",
    priority: "critical",
    status: "required",
    userFriction: "invisible",
  },
  {
    id: "updates",
    title: "Continuous security maintenance",
    description: "Track security dependencies, patch supported software, rotate credentials, monitor incidents and regularly review controls. Security policy is versioned so controls can be updated or rolled back without redesigning customer Rooms.",
    priority: "high",
    status: "required",
    userFriction: "invisible",
  },
  {
    id: "recovery",
    title: "Secure account recovery",
    description: "Recovery must not become the weakest link. Require verified recovery methods, strong audit logs and extra review for finance, health, legal and administrator accounts while keeping an accessible fallback path for legitimate customers.",
    priority: "high",
    status: "required",
    userFriction: "step-up-only",
  },
];

export const BIOMETRIC_POLICY = {
  defaultMode: "device-local-passkey",
  storeFaceImages: false,
  storeBiometricTemplates: false,
  continuousCameraMonitoring: false,
  requireExplicitConsentForRoyalCommandBiometrics: true,
  requirePrivacyImpactAssessment: true,
  allowFallback: true,
  fallbackMethods: ["device PIN", "security key", "approved recovery flow"],
};

export function getSecurityControl(id: string) {
  return SECURITY_CONTROLS.find((control) => control.id === id) || null;
}

export function requiresStepUp(action: string) {
  const normalized = action.trim().toLowerCase();
  return SECURITY_UX_POLICY.examplesOfStepUpActions.some((item) =>
    normalized.includes(item.toLowerCase()),
  );
}
