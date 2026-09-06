import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { localDb } from "@/lib/local-store";
import { resolveRoomRouteId } from "@/lib/rooms/resolve-room-id";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const MAX_ROOM_MESSAGES = 250;

function normaliseMessages(messages: unknown[]) {
  return messages.slice(-MAX_ROOM_MESSAGES).map((message, index) => {
    const item = message && typeof message === "object" ? message as Record<string, unknown> : {};
    const rawContent = item.content;
    let content = "";
    if (typeof rawContent === "string") content = rawContent;
    else if (rawContent == null) content = "";
    else {
      try { content = JSON.stringify(rawContent); }
      catch { content = String(rawContent); }
    }

    return {
      ...item,
      id: typeof item.id === "string" && item.id ? item.id : `room-message-${index}`,
      content,
      author_type: typeof item.author_type === "string" ? item.author_type : undefined,
      authorType: typeof item.authorType === "string" ? item.authorType : undefined,
    };
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: routeId } = await context.params;
  const id = resolveRoomRouteId(routeId);
  const currentUser = {
    fullName: user.fullName,
    defaultLanguage: user.defaultLanguage,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .eq("room_owner_id", user.id)
      .single();
    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: false })
      .limit(MAX_ROOM_MESSAGES);
    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: false });
    return NextResponse.json({
      room,
      messages: normaliseMessages((messages || []).reverse()),
      documents: documents || [],
      user: currentUser,
    });
  }

  const room = localDb.getRoom(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json({
    room,
    messages: normaliseMessages(localDb.listMessages(id)),
    documents: localDb.listDocuments(id),
    user: currentUser,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: routeId } = await context.params;
  const id = resolveRoomRouteId(routeId);
  let body: { name?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hasName = typeof body.name === "string";
  const hasDescription = typeof body.description === "string";
  if (!hasName && !hasDescription) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const name = hasName ? String(body.name).trim().slice(0, 120) : undefined;
  const description = hasDescription ? String(body.description).slice(0, 20000) : undefined;
  if (hasName && !name) return NextResponse.json({ error: "Room name is required" }, { status: 400 });

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    const { data: room, error } = await supabase
      .from("rooms")
      .update(update)
      .eq("id", id)
      .eq("room_owner_id", user.id)
      .select("id, name, description")
      .single();
    if (error || !room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    return NextResponse.json({ ok: true, room });
  }

  let room = localDb.getRoom(id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (name !== undefined) room = localDb.renameRoom(id, name) || room;
  if (description !== undefined) room = localDb.updateRoomDescription(id, description) || room;
  return NextResponse.json({ ok: true, room });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: routeId } = await context.params;
  const id = resolveRoomRouteId(routeId);

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: ownedRoom, error: ownershipError } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", id)
      .eq("room_owner_id", user.id)
      .single();
    if (ownershipError || !ownedRoom) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    await supabase.from("messages").delete().eq("room_id", id);
    await supabase.from("documents").delete().eq("room_id", id);
    await supabase.from("room_members").delete().eq("room_id", id);
    const { error } = await supabase.from("rooms").delete().eq("id", id).eq("room_owner_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const deleted = localDb.deleteRoom(id);
  return deleted
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Room not found" }, { status: 404 });
}
