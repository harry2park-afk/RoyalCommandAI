import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { localDb } from "@/lib/local-store";
import { createRoomSchema } from "@/lib/validations";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ rooms: data });
  }

  return NextResponse.json({ rooms: localDb.listRooms() });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createRoomSchema.parse(body);

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      let householdId = data.householdId;
      if (!householdId) {
        const { data: household, error: hErr } = await supabase
          .from("households")
          .insert({
            owner_id: user.id,
            name: `${user.fullName}'s Household`,
            household_type: "individual",
          })
          .select("*")
          .single();
        if (hErr) {
          return NextResponse.json({ error: hErr.message }, { status: 500 });
        }
        householdId = household.id;
        await supabase.from("household_members").insert({
          household_id: householdId,
          user_id: user.id,
          role: "sovereign",
        });
      }

      const { data: room, error } = await supabase
        .from("rooms")
        .insert({
          household_id: householdId,
          room_owner_id: user.id,
          name: data.name,
          description: data.description || null,
          status: "active",
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await supabase.from("room_members").insert({
        room_id: room.id,
        user_id: user.id,
        role: "owner",
        language_pref: user.defaultLanguage,
      });

      return NextResponse.json({ room });
    }

    const room = localDb.createRoom(data.name, data.description);
    logger.info("rooms.create.local", { roomId: room.id, userId: user.id });
    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
