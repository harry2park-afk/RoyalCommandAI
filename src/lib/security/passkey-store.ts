import { isSupabaseConfigured } from "@/lib/utils";

export type PasskeyReadiness = {
  databaseConfigured: boolean;
  credentialTableExpected: boolean;
  rpId: string | null;
  origin: string | null;
  productionReady: boolean;
  blockers: string[];
};

export function getPasskeyReadiness(): PasskeyReadiness {
  const databaseConfigured = isSupabaseConfigured();
  const rpId = process.env.WEBAUTHN_RP_ID || null;
  const origin = process.env.WEBAUTHN_ORIGIN || null;
  const blockers: string[] = [];

  if (!databaseConfigured) blockers.push("Supabase production database is not configured.");
  if (!rpId) blockers.push("WEBAUTHN_RP_ID is not configured.");
  if (!origin) blockers.push("WEBAUTHN_ORIGIN is not configured.");
  blockers.push("Server-side WebAuthn cryptographic verification must be enabled before customer registration is activated.");
  blockers.push("Account-recovery and lost-device procedures must be approved before production activation.");

  return {
    databaseConfigured,
    credentialTableExpected: databaseConfigured,
    rpId,
    origin,
    productionReady: false,
    blockers,
  };
}

export const PASSKEY_STORAGE_POLICY = {
  storesBiometricData: false,
  storesPrivateKeys: false,
  storesPublicCredentialMaterialOnly: true,
  browserDirectWritesAllowed: false,
  serverVerificationRequired: true,
  revokeInsteadOfDeleteByDefault: true,
  minimumCredentialsRecommended: 2,
};
