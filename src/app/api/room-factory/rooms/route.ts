import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { compileRoomFactoryBlueprint } from "@/lib/rooms/factory";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const factoryCreateSchema = z.object({
  roomName: z.string().min(1).max(120),
  templateId: z.string().min(1).max(80),
  countryCode: z.string().min(1).max(8),
  languageTag: z.string().min(1).max(35),
  languageTags: z.array(z.string().min(1).max(35)).max(10).optional(),
  timeZone: z.string().min(1).max(80),
  currencyCode: z.string().min(3).max(3),
  approvalMode: z.enum(["safe", "approval", "autonomous"]).default("approval"),
  websiteKit: z.boolean().default(false),
  selectedMaterials: z.array(z.string().min(1).max(100)).max(100).default([]),
  householdId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory persistence requires the configured RCA database." }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: manifests, error: manifestError } = await supabase
      .from("room_factory_manifests")
      .select("id, room_id, factory_version, template_id, country_code, language_tag, country_profile_status, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (manifestError) return NextResponse.json({ error: manifestError.message }, { status: 500 });

    const roomIds = (manifests || []).map((manifest) => manifest.room_id);
    if (!roomIds.length) return NextResponse.json({ rooms: [] });

    const { data: rooms, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, status, created_at")
      .in("id", roomIds);
    if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });

    const roomById = new Map((rooms || []).map((room) => [room.id, room]));
    return NextResponse.json({
      rooms: (manifests || []).map((manifest) => ({
        roomId: manifest.room_id,
        manifestId: manifest.id,
        name: roomById.get(manifest.room_id)?.name || "Unnamed Factory Room",
        status: roomById.get(manifest.room_id)?.status || "unknown",
        factoryVersion: manifest.factory_version,
        templateId: manifest.template_id,
        countryCode: manifest.country_code,
        languageTag: manifest.language_tag,
        countryProfileStatus: manifest.country_profile_status,
        createdAt: manifest.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory room listing failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory persistence requires the configured RCA database." }, { status: 503 });
    }

    const input = factoryCreateSchema.parse(await request.json());
    const blueprint = compileRoomFactoryBlueprint(input);
    if (!blueprint.readiness.readyForSafeBuild) {
      return NextResponse.json({ error: "Room Factory blueprint is blocked.", blueprint }, { status: 400 });
    }

    const supabase = await createClient();
    let householdId = input.householdId;

    if (householdId) {
      // `households_select_member` is intentionally used as the first isolation
      // boundary: a supplied household is usable only when the current user can
      // see it as its owner or an existing household member.
      const { data: accessibleHousehold, error: householdAccessError } = await supabase
        .from("households")
        .select("id")
        .eq("id", householdId)
        .maybeSingle();

      if (householdAccessError) {
        return NextResponse.json({ error: householdAccessError.message }, { status: 500 });
      }
      if (!accessibleHousehold) {
        return NextResponse.json({ error: "Household is not available to the current user." }, { status: 403 });
      }
    } else {
      const { data: household, error: householdError } = await supabase
        .from("households")
        .insert({
          owner_id: user.id,
          name: `${user.fullName}'s Household`,
          household_type: "individual",
        })
        .select("*")
        .single();
      if (householdError) return NextResponse.json({ error: householdError.message }, { status: 500 });
      householdId = household.id;

      const { error: householdMemberError } = await supabase.from("household_members").insert({
        household_id: householdId,
        user_id: user.id,
        role: "sovereign",
      });
      if (householdMemberError) {
        await supabase.from("households").delete().eq("id", householdId).eq("owner_id", user.id);
        return NextResponse.json({ error: householdMemberError.message }, { status: 500 });
      }
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        household_id: householdId,
        room_owner_id: user.id,
        name: blueprint.room.name,
        description: `${blueprint.room.templateName} · ${blueprint.room.purpose}`.slice(0, 2000),
        status: "active",
      })
      .select("*")
      .single();
    if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });

    const { error: roomMemberError } = await supabase.from("room_members").insert({
      room_id: room.id,
      user_id: user.id,
      role: "owner",
      language_pref: blueprint.locale.languageTag,
    });
    if (roomMemberError) {
      await supabase.from("rooms").delete().eq("id", room.id).eq("room_owner_id", user.id);
      return NextResponse.json({ error: roomMemberError.message }, { status: 500 });
    }

    const { data: manifest, error: manifestError } = await supabase
      .from("room_factory_manifests")
      .insert({
        room_id: room.id,
        owner_id: user.id,
        factory_version: blueprint.version,
        template_id: blueprint.room.templateId,
        country_code: blueprint.locale.countryCode,
        language_tag: blueprint.locale.languageTag,
        country_profile_status: blueprint.locale.countryProfileStatus,
        manifest: blueprint,
      })
      .select("id, room_id, factory_version, template_id, country_code, language_tag, country_profile_status, created_at")
      .single();

    if (manifestError) {
      await supabase.from("rooms").delete().eq("id", room.id).eq("room_owner_id", user.id);
      return NextResponse.json({ error: manifestError.message }, { status: 500 });
    }

    return NextResponse.json({ room, manifest, blueprint }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory creation failed." }, { status: 500 });
  }
}
