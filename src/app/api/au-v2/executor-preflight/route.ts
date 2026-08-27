import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AU_V2_COOKIE, isAustraliaV2Host, verifyAuV2SessionToken } from "@/lib/auV2TestSession";
import { verifyRcaBuildAuthenticatedUser } from "@/lib/rcaV2/buildAuth";
import { verifyRcaBuildTenantContext } from "@/lib/rcaV2/tenantContext";
import { evaluateHostExecutorBoundary } from "@/lib/rcaV2/hostExecutorBoundary";

export async function GET(request: Request) {
  if (!isAustraliaV2Host(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  if (!verifyAuV2SessionToken(cookieStore.get(AU_V2_COOKIE)?.value)) {
    return NextResponse.json({ error: "Australia V2 test session required." }, { status: 401 });
  }

  const auth = await verifyRcaBuildAuthenticatedUser();
  const tenant = await verifyRcaBuildTenantContext();

  const boundary = evaluateHostExecutorBoundary({
    dedicatedSessionSecretConfigured: Boolean(process.env.AU_V2_SESSION_SECRET),
    authenticatedUserVerified: auth.authenticatedUserVerified,
    tenantIsolationVerified: tenant.verified,
    ruleGateIntegrated: true,
    masterTaskControllerIntegrated: true,
    resourceLockPlannerIntegrated: true,
    reviewerEvidenceGateIntegrated: true,
    // The persistent schema is only a Draft PR and is not active in production.
    persistentLockBackendReady: false,
    // No mutation adapter is intentionally wired during DISABLED_PREFLIGHT.
    executionAdaptersConnected: false,
  });

  return NextResponse.json({
    ok: true,
    ...boundary,
    readiness: {
      dedicatedSessionSecretConfigured: Boolean(process.env.AU_V2_SESSION_SECRET),
      supabaseConfigured: auth.supabaseConfigured,
      authenticatedUserVerified: auth.authenticatedUserVerified,
      tenantConfigured: tenant.configured,
      tenantIsolationVerified: tenant.verified,
    },
  });
}
