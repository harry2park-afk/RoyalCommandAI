import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { compileRoomFactoryV2Blueprint } from "@/lib/rooms/factory";
import { defaultRoomName, resolveDomainProfile } from "@/lib/rooms/factory-v2";
import { DEFAULT_GLOBAL_ROOM_SETTINGS, GLOBAL_ROOM_PRESETS } from "@/lib/rooms/global";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const factoryCreateSchema = z.object({
  roomName: z.string().min(1).max(120).optional(),
  templateId: z.string().min(1).max(80),
  countryCode: z.string().min(1).max(8).optional(),
  languageTag: z.string().min(1).max(35).optional(),
  languageTags: z.array(z.string().min(1).max(35)).max(10).optional(),
  timeZone: z.string().min(1).max(80).optional(),
  currencyCode: z.string().min(3).max(3).optional(),
  approvalMode: z.enum(["safe", "approval", "autonomous"]).default("approval"),
  websiteKit: z.boolean().default(false),
  selectedMaterials: z.array(z.string().min(1).max(100)).max(100).default([]),
  householdId: z.string().uuid().optional(),
  encounterSessionId: z.string().uuid().optional(),
});

function localeDefaults(countryCode: string) {
  const preset = GLOBAL_ROOM_PRESETS.find((item) => item.id === countryCode);
  return preset || DEFAULT_GLOBAL_ROOM_SETTINGS;
}

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

    const rawInput = factoryCreateSchema.parse(await request.json());
    const resolved = resolveDomainProfile(rawInput.templateId);
    const countryCode = (rawInput.countryCode || user.countryCode || "GLOBAL").trim().toUpperCase().slice(0, 8) || "GLOBAL";
    const defaults = localeDefaults(countryCode);
    const languageTag = (rawInput.languageTag || user.defaultLanguage || defaults.languageTag || "en").trim().slice(0, 35) || "en";
    const roomName = (rawInput.roomName || defaultRoomName(user.fullName, resolved.profile)).trim().slice(0, 120);

    const input = {
      roomName,
      templateId: resolved.template.id,
      countryCode,
      languageTag,
      languageTags: rawInput.languageTags,
      timeZone: rawInput.timeZone || defaults.timeZone || DEFAULT_GLOBAL_ROOM_SETTINGS.timeZone,
      currencyCode: rawInput.currencyCode || defaults.currencyCode || DEFAULT_GLOBAL_ROOM_SETTINGS.currencyCode,
      approvalMode: rawInput.approvalMode,
      websiteKit: rawInput.websiteKit,
      selectedMaterials: rawInput.selectedMaterials,
    };

    const blueprint = compileRoomFactoryV2Blueprint(input);
    if (!blueprint.readiness.readyForSafeBuild) {
      return NextResponse.json({ error: "Room Factory V2 blueprint is blocked.", blueprint }, { status: 400 });
    }

    const supabase = await createClient();

    if (rawInput.encounterSessionId) {
      const { data: existingManifest, error: existingManifestError } = await supabase
        .from("room_factory_manifests")
        .select("id, room_id, factory_version, template_id, country_code, language_tag, country_profile_status, created_at, manifest")
        .eq("owner_id", user.id)
        .contains("manifest", { encounterSessionId: rawInput.encounterSessionId })
        .limit(1)
        .maybeSingle();

      if (existingManifestError) return NextResponse.json({ error: existingManifestError.message }, { status: 500 });
      if (existingManifest?.room_id) {
        const { data: existingRoom, error: existingRoomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", existingManifest.room_id)
          .eq("room_owner_id", user.id)
          .maybeSingle();
        if (existingRoomError) return NextResponse.json({ error: existingRoomError.message }, { status: 500 });
        if (existingRoom) {
          return NextResponse.json({ room: existingRoom, manifest: existingManifest, blueprint, reused: true }, { status: 200 });
        }
      }
    }

    let householdId = rawInput.householdId;
    if (!householdId) {
      const { data: existingMembership } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      householdId = existingMembership?.household_id || undefined;
    }

    if (!householdId) {
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

    const storedManifest = rawInput.encounterSessionId
      ? { ...blueprint, encounterSessionId: rawInput.encounterSessionId }
      : blueprint;

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
        manifest: storedManifest,
      })
      .select("id, room_id, factory_version, template_id, country_code, language_tag, country_profile_status, created_at")
      .single();

    if (manifestError) {
      await supabase.from("rooms").delete().eq("id", room.id).eq("room_owner_id", user.id);
      return NextResponse.json({ error: manifestError.message }, { status: 500 });
    }

    return NextResponse.json({ room, manifest, blueprint, reused: false }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory creation failed." }, { status: 500 });
  }
}
