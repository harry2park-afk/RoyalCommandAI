import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const workspaceSchema = z.object({
  caseStory: z.string().max(100_000),
  desiredOutcome: z.string().max(20_000),
});

const evidenceSchema = z.object({
  title: z.string().trim().min(1).max(240),
  eventDate: z.string().date().nullable().optional(),
  description: z.string().max(20_000).default(""),
  documentId: z.string().uuid().nullable().optional(),
});

async function legalRoomContext(roomId: string, userId: string) {
  const supabase = await createClient();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, name, room_owner_id")
    .eq("id", roomId)
    .eq("room_owner_id", userId)
    .single();
  if (roomError || !room) return { supabase, room: null, manifest: null };

  const { data: manifest } = await supabase
    .from("room_factory_manifests")
    .select("template_id, language_tag, country_code")
    .eq("room_id", roomId)
    .eq("owner_id", userId)
    .maybeSingle();

  return { supabase, room, manifest };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ enabled: false });

  const { id } = await context.params;
  const { supabase, room, manifest } = await legalRoomContext(id, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (manifest?.template_id !== "legal") return NextResponse.json({ enabled: false });

  const [{ data: workspace }, { data: evidence }, { data: documents }] = await Promise.all([
    supabase
      .from("legal_room_workspaces")
      .select("case_story, desired_outcome, updated_at")
      .eq("room_id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("legal_evidence_items")
      .select("id, title, event_date, description, document_id, created_at, updated_at")
      .eq("room_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, filename, mime_type, size_bytes, created_at")
      .eq("room_id", id)
      .eq("uploaded_by", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    enabled: true,
    room: { id: room.id, name: room.name },
    languageTag: manifest.language_tag,
    countryCode: manifest.country_code,
    workspace: {
      caseStory: workspace?.case_story || "",
      desiredOutcome: workspace?.desired_outcome || "",
      updatedAt: workspace?.updated_at || null,
    },
    evidence: evidence || [],
    documents: documents || [],
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id } = await context.params;
  const input = workspaceSchema.parse(await request.json());
  const { supabase, room, manifest } = await legalRoomContext(id, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (manifest?.template_id !== "legal") return NextResponse.json({ error: "Not a legal Room" }, { status: 400 });

  const { data, error } = await supabase
    .from("legal_room_workspaces")
    .upsert({
      room_id: id,
      owner_id: user.id,
      case_story: input.caseStory,
      desired_outcome: input.desiredOutcome,
      updated_at: new Date().toISOString(),
    }, { onConflict: "room_id" })
    .select("case_story, desired_outcome, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    workspace: {
      caseStory: data.case_story,
      desiredOutcome: data.desired_outcome,
      updatedAt: data.updated_at,
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id } = await context.params;
  const input = evidenceSchema.parse(await request.json());
  const { supabase, room, manifest } = await legalRoomContext(id, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (manifest?.template_id !== "legal") return NextResponse.json({ error: "Not a legal Room" }, { status: 400 });

  if (input.documentId) {
    const { data: document } = await supabase
      .from("documents")
      .select("id")
      .eq("id", input.documentId)
      .eq("room_id", id)
      .eq("uploaded_by", user.id)
      .maybeSingle();
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("legal_evidence_items")
    .insert({
      room_id: id,
      owner_id: user.id,
      document_id: input.documentId || null,
      title: input.title,
      event_date: input.eventDate || null,
      description: input.description,
    })
    .select("id, title, event_date, description, document_id, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, evidence: data }, { status: 201 });
}
