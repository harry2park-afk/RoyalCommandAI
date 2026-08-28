import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("acquire"),
    roomId: z.string().uuid(),
    workRecordId: z.string().uuid(),
    laneId: z.string().min(1).max(80),
    leaseSeconds: z.number().int().min(60).max(3600).default(900),
  }),
  z.object({
    action: z.literal("release"),
    roomId: z.string().uuid(),
    workRecordId: z.string().uuid(),
    laneId: z.string().min(1).max(80),
    lockTokens: z.array(z.string().uuid()).min(1).max(20),
  }),
]);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Persistent Resource Locks require the configured RCA database." }, { status: 503 });
    }

    const input = requestSchema.parse(await request.json());
    const supabase = await createClient();

    if (input.action === "acquire") {
      const { data, error } = await supabase.rpc("start_room_factory_lane_execution", {
        p_room_id: input.roomId,
        p_work_record_id: input.workRecordId,
        p_lane_id: input.laneId,
        p_lease_seconds: input.leaseSeconds,
      });

      if (error) return NextResponse.json({ error: error.message }, { status: 409 });
      const locks = Array.isArray(data) ? data : [];
      if (!locks.length || locks.some((lock) => !lock?.lock_token || !lock?.resource_key || lock?.lane_status !== "running")) {
        return NextResponse.json({ error: "Execution-start lock evidence is incomplete." }, { status: 500 });
      }

      return NextResponse.json({
        action: "acquire",
        roomId: input.roomId,
        workRecordId: input.workRecordId,
        laneId: input.laneId,
        locks,
        lockCount: locks.length,
        executionStarted: true,
        laneStatus: "running",
      });
    }

    const { data: releasedCount, error } = await supabase.rpc("release_room_factory_lane_locks", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: input.laneId,
      p_lock_tokens: input.lockTokens,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 409 });

    return NextResponse.json({
      action: "release",
      roomId: input.roomId,
      workRecordId: input.workRecordId,
      laneId: input.laneId,
      releasedCount: Number(releasedCount || 0),
      executionStarted: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Resource Lock operation failed." }, { status: 500 });
  }
}
