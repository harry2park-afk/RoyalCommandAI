import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const phoneSchema = z.object({
  phoneE164: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
  countryCode: z.string().trim().min(2).max(2).transform((value) => value.toUpperCase()).nullable().optional(),
  regionCode: z.string().trim().max(16).transform((value) => value.toUpperCase()).nullable().optional(),
  useAsDefaultOutbound: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ profile: null });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rc_phone_profiles")
    .select("phone_e164, country_code, region_code, verified, verified_at, use_as_default_outbound, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    profile: data ? {
      phoneE164: data.phone_e164,
      countryCode: data.country_code,
      regionCode: data.region_code,
      verified: data.verified,
      verifiedAt: data.verified_at,
      useAsDefaultOutbound: data.use_as_default_outbound,
      updatedAt: data.updated_at,
    } : null,
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const input = phoneSchema.parse(await request.json());
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("rc_phone_profiles")
    .select("phone_e164, verified, verified_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const numberChanged = current?.phone_e164 !== input.phoneE164;
  const { data, error } = await supabase
    .from("rc_phone_profiles")
    .upsert({
      user_id: user.id,
      phone_e164: input.phoneE164,
      country_code: input.countryCode || null,
      region_code: input.regionCode || null,
      verified: numberChanged ? false : Boolean(current?.verified),
      verified_at: numberChanged ? null : current?.verified_at || null,
      use_as_default_outbound: input.useAsDefaultOutbound ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("phone_e164, country_code, region_code, verified, verified_at, use_as_default_outbound, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    profile: {
      phoneE164: data.phone_e164,
      countryCode: data.country_code,
      regionCode: data.region_code,
      verified: data.verified,
      verifiedAt: data.verified_at,
      useAsDefaultOutbound: data.use_as_default_outbound,
      updatedAt: data.updated_at,
    },
  });
}
