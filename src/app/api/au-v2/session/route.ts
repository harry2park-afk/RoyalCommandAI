import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AU_V2_COOKIE, isAustraliaV2Host, verifyAuV2SessionToken } from "@/lib/auV2TestSession";

export async function GET(request: Request) {
  if (!isAustraliaV2Host(request)) return NextResponse.json({ active: false }, { status: 403 });
  const cookieStore = await cookies();
  const active = verifyAuV2SessionToken(cookieStore.get(AU_V2_COOKIE)?.value);
  return NextResponse.json({ active });
}
