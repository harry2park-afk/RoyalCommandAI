import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ profile: null });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rc_cloud_phone_profiles")
    .select("provider, phone_e164, country_code, status, capabilities, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    profile: data ? {
      provider: data.provider,
      phoneE164: data.phone_e164,
      countryCode: data.country_code,
      status: data.status,
      capabilities: data.capabilities,
      updatedAt: data.updated_at,
    } : null,
  });
}
