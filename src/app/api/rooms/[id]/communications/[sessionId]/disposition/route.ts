import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const dispositionSchema = z.discriminatedUnion("disposition", [
  z.object({ disposition: z.literal("case"), caseId: z.string().uuid() }),
  z.object({ disposition: z.literal("personal") }),
  z.object({ disposition: z.literal("deleted") }),
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; sessionId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id: roomId, sessionId } = await context.params;
  const input = dispositionSchema.parse(await request.json());
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("room_owner_id", user.id)
    .maybeSingle();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: session } = await supabase
    .from("communication_sessions")
    .select("id, case_id, disposition")
    .eq("id", sessionId)
    .eq("room_id", roomId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  let caseId: string | null = null;
  if (input.disposition === "case") {
    const { data: legalCase } = await supabase
      .from("legal_cases")
      .select("id")
      .eq("id", input.caseId)
      .eq("room_id", roomId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!legalCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    caseId = legalCase.id;
  }

  if (input.disposition === "deleted") {
    await supabase
      .from("communication_session_records")
      .delete()
      .eq("session_id", sessionId)
      .eq("owner_id", user.id);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("communication_sessions")
    .update({
      case_id: caseId,
      disposition: input.disposition,
      dispositioned_at: now,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("room_id", roomId)
    .eq("owner_id", user.id)
    .select("id, room_id, case_id, channel, direction, status, recording_policy, recording_status, disposition, dispositioned_at, started_at, ended_at, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (caseId) {
    await supabase.from("legal_cases").update({ updated_at: now })
      .eq("id", caseId).eq("room_id", roomId).eq("owner_id", user.id);
  }

  return NextResponse.json({ session: data });
}
