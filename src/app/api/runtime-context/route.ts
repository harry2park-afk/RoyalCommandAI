import { NextResponse } from "next/server";
import { getServerDomainRuntimeContext } from "@/lib/runtime/serverDomainContext";
import { toPublicDomainRuntimeContext } from "@/config/countryResolver";

export async function GET() {
  const context = await getServerDomainRuntimeContext();
  if (!context) return NextResponse.json({ error: "Domain runtime context unavailable" }, { status: 404 });
  return NextResponse.json({ context: toPublicDomainRuntimeContext(context) }, { headers: { "Cache-Control": "private, no-store" } });
}
