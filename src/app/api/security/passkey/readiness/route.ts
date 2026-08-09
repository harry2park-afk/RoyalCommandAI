import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPasskeyReadiness, PASSKEY_STORAGE_POLICY } from "@/lib/security/passkey-store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  return NextResponse.json({
    readiness: getPasskeyReadiness(),
    storagePolicy: PASSKEY_STORAGE_POLICY,
  });
}
