import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { localDb } from "@/lib/local-store";
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

  const { id } = await context.params;
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
      .order("created_at", { ascending: true });
    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: false });
    return NextResponse.json({
      room,
      messages: normaliseMessages(messages || []),
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

  const { id } = await context.params;
  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return NextResponse.json({ error: "Room name is required" }, { status: 400 });

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: room, error } = await supabase
      .from("rooms")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("room_owner_id", user.id)
      .select("id, name")
      .single();
    if (error || !room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    return NextResponse.json({ ok: true, room });
  }

  const room = localDb.renameRoom(id, name);
  return room
    ? NextResponse.json({ ok: true, room })
    : NextResponse.json({ error: "Room not found" }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

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
