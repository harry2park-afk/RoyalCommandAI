export type SecurityControl = {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "standard";
  status: "planned" | "required" | "active";
};

export const SECURITY_CONTROLS: SecurityControl[] = [
  {
    id: "passkeys",
    title: "Passkeys / phishing-resistant MFA",
    description: "Use WebAuthn/passkeys as the preferred customer authentication method for sensitive Rooms. Device biometrics or a PIN unlock the local cryptographic credential; Royal Command does not need the face or fingerprint data.",
    priority: "critical",
    status: "required",
  },
  {
    id: "step-up",
    title: "Step-up authentication for sensitive actions",
    description: "Require fresh user verification before bank connections, financial-data export, payment changes, professional sharing, identity changes, password/passkey recovery or other high-risk actions.",
    priority: "critical",
    status: "required",
  },
  {
    id: "room-isolation",
    title: "Customer Room isolation",
    description: "Enforce server-side tenant and Room boundaries so one customer's data, documents, agents and financial records cannot be accessed from another Room.",
    priority: "critical",
    status: "required",
  },
  {
    id: "least-privilege",
    title: "Least-privilege permissions",
    description: "Every agent, employee, professional and integration receives only the minimum permissions required for the approved task and duration.",
    priority: "critical",
    status: "required",
  },
  {
    id: "encryption",
    title: "Encryption and secret separation",
    description: "Encrypt sensitive data in transit and at rest. Keep production secrets, provider tokens and customer financial credentials out of client-side code and out of ordinary logs.",
    priority: "critical",
    status: "required",
  },
  {
    id: "audit",
    title: "Tamper-resistant security audit trail",
    description: "Record successful and failed authentication, permission changes, exports, bank-data access and administrator actions, with central monitoring and protected retention.",
    priority: "high",
    status: "required",
  },
  {
    id: "session-risk",
    title: "Risk-aware sessions",
    description: "Use short-lived sensitive sessions, inactivity timeout, new-device alerts, suspicious-session revocation and re-authentication after risk changes.",
    priority: "high",
    status: "required",
  },
  {
    id: "biometric-local",
    title: "Device-local face / fingerprint verification",
    description: "Prefer Face ID, Windows Hello, Android biometrics or equivalent only through the device authenticator/passkey. Do not continuously upload, store or centrally match customers' face images or biometric templates.",
    priority: "critical",
    status: "required",
  },
  {
    id: "continuous-presence",
    title: "Continuous-presence protection without surveillance",
    description: "For high-security use, rely on device lock, session timeout, presence re-checks and step-up passkey prompts. Continuous camera-based facial surveillance is not the default security mechanism.",
    priority: "high",
    status: "required",
  },
  {
    id: "privacy-impact",
    title: "Biometric Privacy Impact Assessment",
    description: "Any future Royal Command-controlled facial recognition feature must be opt-in, purpose-limited and independently privacy-reviewed before collection because biometric templates are sensitive information in Australia.",
    priority: "critical",
    status: "required",
  },
  {
    id: "updates",
    title: "Continuous security maintenance",
    description: "Track security dependencies, patch supported software, rotate credentials, monitor incidents and regularly review controls against current Australian cyber-security and privacy guidance.",
    priority: "high",
    status: "required",
  },
  {
    id: "recovery",
    title: "Secure account recovery",
    description: "Recovery must not become the weakest link. Require verified recovery methods, strong audit logs and extra review for finance, health, legal and administrator accounts.",
    priority: "high",
    status: "required",
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
