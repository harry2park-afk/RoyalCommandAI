import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

async function ownedRoom(supabase: Awaited<ReturnType<typeof createClient>>, roomId: string, userId: string) {
  const { data } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("room_owner_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Service catalog unavailable" }, { status: 503 });

  const { id } = await context.params;
  const supabase = await createClient();
  if (!(await ownedRoom(supabase, id, user.id))) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const [{ data: services, error: servicesError }, { data: selections, error: selectionsError }] = await Promise.all([
    supabase
      .from("rc_service_catalog")
      .select("service_key,category,name_ko,name_en,summary_ko,summary_en,pricing_type,currency,price_minor,price_status,default_included,sort_order,connection_status")
      .eq("active", true)
      .eq("customer_selectable", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("rc_room_service_selections")
      .select("service_key,selection_status")
      .eq("room_id", id)
      .eq("owner_id", user.id),
  ]);

  if (servicesError || selectionsError) {
    return NextResponse.json({ error: servicesError?.message || selectionsError?.message || "Unable to load services" }, { status: 500 });
  }

  const statusByKey = new Map((selections || []).map((row) => [row.service_key, row.selection_status]));
  return NextResponse.json({
    services: (services || []).map((service) => ({
      ...service,
      selection_status: statusByKey.get(service.service_key) || (service.default_included ? "active" : "cancelled"),
    })),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Service catalog unavailable" }, { status: 503 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { serviceKey?: unknown; action?: unknown } | null;
  const serviceKey = typeof body?.serviceKey === "string" ? body.serviceKey.trim() : "";
  const action = body?.action === "connect" || body?.action === "disconnect" ? body.action : null;
  if (!serviceKey || !action) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  if (!(await ownedRoom(supabase, id, user.id))) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: service } = await supabase
    .from("rc_service_catalog")
    .select("service_key,default_included,active,customer_selectable")
    .eq("service_key", serviceKey)
    .maybeSingle();
  if (!service?.active || !service?.customer_selectable) return NextResponse.json({ error: "Service unavailable" }, { status: 404 });
  if (action === "disconnect" && service.default_included) return NextResponse.json({ error: "Included core service cannot be disconnected" }, { status: 400 });

  const now = new Date().toISOString();
  const row = {
    room_id: id,
    owner_id: user.id,
    service_key: serviceKey,
    selection_status: action === "connect" ? "selected" : "cancelled",
    selected_at: now,
    activated_at: null,
    cancelled_at: action === "disconnect" ? now : null,
    updated_at: now,
  };

  const { error } = await supabase
    .from("rc_room_service_selections")
    .upsert(row, { onConflict: "room_id,service_key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, serviceKey, selectionStatus: row.selection_status });
}
