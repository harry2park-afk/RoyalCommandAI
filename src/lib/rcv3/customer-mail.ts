import { getGoogleConnection, googleApi, googleWorkspaceConfigured } from "@/lib/google-workspace";
import { createAdminClient } from "@/lib/supabase/admin";

export async function customerMailStatus(ownerId: string, serverOwned = false) {
  const configured = googleWorkspaceConfigured();
  if (!configured) return {configured, connected: false, email: ""};
  try {
    const db = serverOwned ? createAdminClient() : undefined;
    const connection = await getGoogleConnection(ownerId, db);
    if (!connection) return {configured, connected: false, email: ""};
    const profile = await googleApi(ownerId, "https://gmail.googleapis.com/gmail/v1/users/me/profile", {signal: AbortSignal.timeout(15000)}, db) as {emailAddress?: string};
    return {configured, connected: Boolean(profile.emailAddress), email: profile.emailAddress || ""};
  } catch { return {configured, connected: false, email: ""}; }
}
export async function verifyCustomerMail(ownerId: string, expectedEmail: string, serverOwned = false) {
  const status = await customerMailStatus(ownerId, serverOwned);
  if (!status.connected || status.email.toLowerCase() !== expectedEmail.trim().toLowerCase()) throw new Error("RCV3_EMAIL_CONNECT_REQUIRED");
  return status;
}
