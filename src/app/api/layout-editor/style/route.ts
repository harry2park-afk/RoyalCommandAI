import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/utils";
import {
  emptyRoomHeaderStyleConfig,
  sanitiseRoomHeaderStyleConfig,
} from "@/lib/layout-editor-style";
import {
  LAYOUT_EDITOR_DEVICE_COOKIE,
  LAYOUT_EDITOR_SESSION_COOKIE,
  sha256Hex,
} from "@/lib/layout-editor-security";

async function hasUnlockedTrustedLayoutSession(userId: string) {
  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(LAYOUT_EDITOR_DEVICE_COOKIE)?.value;
    const sessionToken = cookieStore.get(LAYOUT_EDITOR_SESSION_COOKIE)?.value;
    if (!deviceToken || !sessionToken) return false;
    const admin = createAdminClient();
    const { data: device } = await admin
      .from("layout_editor_trusted_devices")
      .select("id")
      .eq("user_id", userId)
      .eq("device_cookie_hash", sha256Hex(deviceToken))
      .is("revoked_at", null)
      .maybeSingle();
    if (!device?.id) return false;
    const { data: session } = await admin
      .from("layout_editor_sessions")
      .select("token_hash")
      .eq("token_hash", sha256Hex(sessionToken))
      .eq("user_id", userId)
      .eq("device_id", device.id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return Boolean(session);
  } catch {
    return false;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ style: emptyRoomHeaderStyleConfig() });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("ui_preferences, role")
    .eq("id", user.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data?.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const raw = data?.ui_preferences && typeof data.ui_preferences === "object" && !Array.isArray(data.ui_preferences)
    ? data.ui_preferences as Record<string, unknown>
    : {};
  const style = sanitiseRoomHeaderStyleConfig(raw.layoutRoomHeaderStyleV1) || emptyRoomHeaderStyleConfig();
  return NextResponse.json({ style });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, style: emptyRoomHeaderStyleConfig() });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const style = sanitiseRoomHeaderStyleConfig(body.style);
  if (!style) return NextResponse.json({ error: "Invalid style config." }, { status: 400 });

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("ui_preferences, role")
    .eq("id", user.id)
    .single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (current?.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (!(await hasUnlockedTrustedLayoutSession(user.id))) {
    return NextResponse.json({ error: "Unlock Layout Editor with a trusted device passkey first." }, { status: 403 });
  }

  const existing = current?.ui_preferences && typeof current.ui_preferences === "object" && !Array.isArray(current.ui_preferences)
    ? current.ui_preferences as Record<string, unknown>
    : {};
  const merged = { ...existing, layoutRoomHeaderStyleV1: style };
  const { error } = await supabase
    .from("profiles")
    .update({ ui_preferences: merged, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, style });
}
