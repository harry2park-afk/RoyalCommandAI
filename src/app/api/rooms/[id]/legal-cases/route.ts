import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

const updateSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["active", "archived"]).optional(),
}).refine((value) => value.title !== undefined || value.status !== undefined, {
  message: "Nothing to update",
});

async function legalRoomContext(roomId: string, userId: string) {
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_owner_id")
    .eq("id", roomId)
    .eq("room_owner_id", userId)
    .maybeSingle();
  if (!room) return { supabase, enabled: false };

  const { data: manifest } = await supabase
    .from("room_factory_manifests")
    .select("template_id")
    .eq("room_id", roomId)
    .eq("owner_id", userId)
    .maybeSingle();

  return { supabase, enabled: manifest?.template_id === "legal" };
}

const caseSelect = "id, case_number, title, status, created_at, updated_at";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ cases: [] });

  const { id } = await context.params;
  const { supabase, enabled } = await legalRoomContext(id, user.id);
  if (!enabled) return NextResponse.json({ error: "Not a legal Room" }, { status: 400 });

  const { data, error } = await supabase
    .from("legal_cases")
    .select(caseSelect)
    .eq("room_id", id)
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cases: data || [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id } = await context.params;
  const input = createSchema.parse(await request.json());
  const { supabase, enabled } = await legalRoomContext(id, user.id);
  if (!enabled) return NextResponse.json({ error: "Not a legal Room" }, { status: 400 });

  const { data, error } = await supabase
    .from("legal_cases")
    .insert({
      room_id: id,
      owner_id: user.id,
      title: input.title,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .select(caseSelect)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ case: data }, { status: 201 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id } = await context.params;
  const input = updateSchema.parse(await request.json());
  const { supabase, enabled } = await legalRoomContext(id, user.id);
  if (!enabled) return NextResponse.json({ error: "Not a legal Room" }, { status: 400 });

  const update: { title?: string; status?: "active" | "archived"; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) update.title = input.title;
  if (input.status !== undefined) update.status = input.status;

  const { data, error } = await supabase
    .from("legal_cases")
    .update(update)
    .eq("id", input.caseId)
    .eq("room_id", id)
    .eq("owner_id", user.id)
    .select(caseSelect)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ case: data });
}
