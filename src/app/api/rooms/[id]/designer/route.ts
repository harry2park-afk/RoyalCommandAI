import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import {
  emptyCustomerRoomDesignConfig,
  sanitiseCustomerRoomDesignConfig,
} from "@/lib/customer-room-designer";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function roomAccess(roomId: string, userId: string) {
  const supabase = await createClient();
  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, room_owner_id")
    .eq("id", roomId)
    .maybeSingle();
  if (error || !room) return { supabase, room: null, canEdit: false };
  return { supabase, room, canEdit: room.room_owner_id === userId };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Room Designer requires Supabase." }, { status: 503 });

  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid Room ID" }, { status: 400 });

  const { supabase, room, canEdit } = await roomAccess(id, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("room_ui_designs")
    .select("design, updated_at")
    .eq("room_id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const design = sanitiseCustomerRoomDesignConfig(data?.design) || emptyCustomerRoomDesignConfig();
  return NextResponse.json({ roomId: id, canEdit, design, updatedAt: data?.updated_at || null });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Room Designer requires Supabase." }, { status: 503 });

  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid Room ID" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const design = sanitiseCustomerRoomDesignConfig(body.design);
  if (!design) return NextResponse.json({ error: "Invalid Room design" }, { status: 400 });

  const { supabase, room, canEdit } = await roomAccess(id, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (!canEdit) return NextResponse.json({ error: "Only the Room owner can change this design." }, { status: 403 });

  const next = { ...design, updatedAt: new Date().toISOString() };
  const { error } = await supabase
    .from("room_ui_designs")
    .upsert({
      room_id: id,
      design: next,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "room_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, roomId: id, design: next });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Room Designer requires Supabase." }, { status: 503 });

  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid Room ID" }, { status: 400 });

  const { supabase, room, canEdit } = await roomAccess(id, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (!canEdit) return NextResponse.json({ error: "Only the Room owner can reset this design." }, { status: 403 });

  const { error } = await supabase.from("room_ui_designs").delete().eq("room_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, roomId: id, design: emptyCustomerRoomDesignConfig() });
}
