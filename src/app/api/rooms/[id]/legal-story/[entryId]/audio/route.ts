import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const STORAGE_BUCKET = "matter-documents";

async function contextFor(roomId: string, entryId: string, userId: string) {
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("legal_story_entries")
    .select("id, room_id, owner_id, audio_document_id")
    .eq("id", entryId)
    .eq("room_id", roomId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!entry?.audio_document_id) return { supabase, entry: null, document: null };

  const { data: document } = await supabase
    .from("documents")
    .select("id, storage_path, filename, mime_type")
    .eq("id", entry.audio_document_id)
    .eq("room_id", roomId)
    .eq("uploaded_by", userId)
    .maybeSingle();

  return { supabase, entry, document };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; entryId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id, entryId } = await context.params;
  const { supabase, document } = await contextFor(id, entryId, user.id);
  if (!document?.storage_path) return NextResponse.json({ error: "Audio not found" }, { status: 404 });

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(document.storage_path, 600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Could not open audio" }, { status: 500 });
  }

  return NextResponse.json({
    url: data.signedUrl,
    filename: document.filename,
    mimeType: document.mime_type,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; entryId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id, entryId } = await context.params;
  const { supabase, entry, document } = await contextFor(id, entryId, user.id);
  if (!entry || !document) return NextResponse.json({ error: "Audio not found" }, { status: 404 });

  const { error: unlinkError } = await supabase
    .from("legal_story_entries")
    .update({ audio_document_id: null, updated_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("room_id", id)
    .eq("owner_id", user.id);

  if (unlinkError) return NextResponse.json({ error: unlinkError.message }, { status: 500 });

  if (document.storage_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([document.storage_path]);
  }
  await supabase
    .from("documents")
    .delete()
    .eq("id", document.id)
    .eq("room_id", id)
    .eq("uploaded_by", user.id);

  return NextResponse.json({ ok: true });
}
