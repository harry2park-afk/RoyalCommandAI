import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("evidence"),
    roomId: z.string().uuid(),
    workRecordId: z.string().uuid(),
    laneId: z.string().min(1).max(80),
    evidence: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, "Evidence is required."),
  }),
  z.object({
    action: z.literal("review"),
    roomId: z.string().uuid(),
    workRecordId: z.string().uuid(),
    laneId: z.string().min(1).max(80),
    reviewerProvider: z.string().min(1).max(80),
    verdict: z.enum(["pass", "fix_required", "blocked"]),
    notes: z.record(z.string(), z.unknown()).default({}),
  }),
]);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory review requires the configured RCA database." }, { status: 503 });
    }

    const input = requestSchema.parse(await request.json());
    const supabase = await createClient();

    if (input.action === "evidence") {
      const { data, error } = await supabase.rpc("submit_room_factory_lane_evidence", {
        p_room_id: input.roomId,
        p_work_record_id: input.workRecordId,
        p_lane_id: input.laneId,
        p_evidence: input.evidence,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 409 });
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.lane_uuid || row?.lane_status !== "awaiting_review") {
        return NextResponse.json({ error: "Evidence transition evidence is incomplete." }, { status: 500 });
      }
      return NextResponse.json({ action: "evidence", roomId: input.roomId, workRecordId: input.workRecordId, laneId: input.laneId, lane: row, executionStarted: false });
    }

    const { data, error } = await supabase.rpc("review_room_factory_lane", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: input.laneId,
      p_reviewer_provider: input.reviewerProvider,
      p_verdict: input.verdict,
      p_notes: input.notes,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.lane_uuid || !["passed", "fix_required", "blocked"].includes(row?.lane_status)) {
      return NextResponse.json({ error: "Review verdict evidence is incomplete." }, { status: 500 });
    }

    return NextResponse.json({ action: "review", roomId: input.roomId, workRecordId: input.workRecordId, laneId: input.laneId, lane: row, executionStarted: false });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory review operation failed." }, { status: 500 });
  }
}
