import { NextResponse } from "next/server";
import { AU_V2_COOKIE, createAuV2SessionToken, isAustraliaV2Host } from "@/lib/auV2TestSession";

export async function POST(request: Request) {
  if (!isAustraliaV2Host(request)) {
    return NextResponse.json({ error: "Australia V2 test access is only available on the Australia domain." }, { status: 403 });
  }
  const token = createAuV2SessionToken();
  if (!token) {
    return NextResponse.json({ error: "Australia V2 test session is not configured." }, { status: 503 });
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
