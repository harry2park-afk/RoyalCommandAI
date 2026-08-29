import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveServiceProviderV2 } from "@/lib/rooms/provider-resolver-v2";

const SERVICE_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{1,119}$/i;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = (request.nextUrl.searchParams.get("serviceKey") || "").trim();
  const countryCode = (request.nextUrl.searchParams.get("countryCode") || user.countryCode || "").trim().toUpperCase();

  if (!SERVICE_KEY_PATTERN.test(serviceKey)) {
    return NextResponse.json({ error: "Invalid serviceKey" }, { status: 400 });
  }
  if (!COUNTRY_PATTERN.test(countryCode)) {
    return NextResponse.json({ error: "A two-letter countryCode is required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const resolution = await resolveServiceProviderV2(supabase, serviceKey, countryCode);

    if (!resolution) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    // This endpoint intentionally exposes only customer-safe provider information.
    // Supplier cost, RC margin, commission rates and internal commercial notes remain server-side.
    return NextResponse.json({ resolution });
  } catch (error) {
    console.error("provider resolver failed", error);
    return NextResponse.json({ error: "Unable to resolve service provider" }, { status: 500 });
  }
}
