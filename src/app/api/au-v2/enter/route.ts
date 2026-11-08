import { NextResponse } from "next/server";
import { AU_V2_COOKIE, createAuV2SessionToken, isAustraliaV2Host } from "@/lib/auV2TestSession";
import { verifyRcaBuildAuthenticatedUser } from "@/lib/rcaV2/buildAuth";
import { verifyRcaBuildTenantContext } from "@/lib/rcaV2/tenantContext";

export async function POST(request: Request) {
  if (!isAustraliaV2Host(request)) {
    return NextResponse.json({ error: "RCA access is not available on this host." }, { status: 403 });
  }

  const auth = await verifyRcaBuildAuthenticatedUser();
  if (!auth.authenticatedUserVerified) {
    return NextResponse.json({ error: auth.reason || "Authenticated RCA user required." }, { status: 401 });
  }

  const tenant = await verifyRcaBuildTenantContext();
  if (!tenant.verified) {
    return NextResponse.json({ error: tenant.reason || "RCA Room/Tenant access is not verified." }, { status: 403 });
  }

  const token = createAuV2SessionToken();
  if (!token) {
    return NextResponse.json({ error: "Dedicated RCA session signing secret is not configured." }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AU_V2_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/au-v2",
    maxAge: 4 * 60 * 60,
  });
  return response;
}
