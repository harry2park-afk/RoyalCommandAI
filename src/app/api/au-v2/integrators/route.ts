import { NextResponse } from "next/server";
import { isAustraliaV2Host } from "@/lib/auV2TestSession";
import { listRcaIntegratorModels } from "@/lib/rcaV2/integratorRegistry";

export async function GET(request: Request) {
  if (!isAustraliaV2Host(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ integrators: listRcaIntegratorModels() });
}
