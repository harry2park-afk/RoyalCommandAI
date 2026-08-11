import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { localDb } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((value: unknown): value is string => typeof value === "string")
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No message ids provided" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("room_id", roomId)
      .in("id", ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  const deleted = localDb.deleteMessages(roomId, ids);
  return NextResponse.json({ ok: true, deleted });
}
