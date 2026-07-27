import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const cookieStore = await cookies();
  cookieStore.delete("rc_session");
  return NextResponse.json({ ok: true });
}
