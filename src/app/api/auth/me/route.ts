import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const profilePatchSchema = z.object({
  countryCode: z.string().length(2),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured() || user.mode !== "supabase") {
    return NextResponse.json({ error: "Profile country persistence requires the configured RCA account database." }, { status: 503 });
  }

  try {
    const input = profilePatchSchema.parse(await request.json());
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      data: { country_code: input.countryCode },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, countryCode: input.countryCode });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Profile update failed." }, { status: 500 });
  }
}
