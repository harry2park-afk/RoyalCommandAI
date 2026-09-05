#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PRODUCTION_PROJECT_REF = "aygawkavujjmybekswrg";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assertDisposableUrl(rawUrl) {
  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase();
  const hosted = host.match(/^([a-z0-9-]+)\.supabase\.co$/);
  if (hosted?.[1] === PRODUCTION_PROJECT_REF) {
    throw new Error("Refusing to run Room Factory schema-stage evidence against Production Supabase.");
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Expected disposable localhost Supabase, received ${host}`);
  }
  if (process.env.RC_SCHEMA_STAGE_ALLOW_LOCALHOST !== "1") {
    throw new Error("Local Supabase evidence requires RC_SCHEMA_STAGE_ALLOW_LOCALHOST=1");
  }
}

function client(url, key) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function firstRow(data) {
  const row = Array.isArray(data) ? data[0] : data;
  assert.ok(row?.room_data?.id, "RPC returned no Room id");
  assert.ok(row?.manifest_data?.id, "RPC returned no manifest id");
  assert.equal(typeof row.reused, "boolean", "RPC returned no reused flag");
  return row;
}

async function exactCount(query, label) {
  const { count, error } = await query;
  if (error) throw new Error(`${label} failed: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const url = required("RC_SCHEMA_STAGE_SUPABASE_URL");
  const anonKey = required("RC_SCHEMA_STAGE_ANON_KEY");
  const serviceRoleKey = required("RC_SCHEMA_STAGE_SERVICE_ROLE_KEY");
  const email = required("RC_SCHEMA_STAGE_TEST_EMAIL");
  const password = required("RC_SCHEMA_STAGE_TEST_PASSWORD");
  assertDisposableUrl(url);

  const admin = client(url, serviceRoleKey);
  const caller = client(url, anonKey);
  let userId = null;

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error(`Test-user creation failed: ${created.error.message}`);
  userId = created.data.user?.id ?? null;
  assert.ok(userId, "Test-user creation returned no user id");

  const signedIn = await caller.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw new Error(`Test-user sign-in failed: ${signedIn.error.message}`);
  assert.equal(signedIn.data.user?.id, userId, "Signed-in user mismatch");

  const createdRoomIds = new Set();

  const baseArgs = {
    p_household_id: null,
    p_household_name: "RC schema-stage evidence",
    p_room_description: "Disposable Room Factory schema-stage evidence",
    p_language_pref: "en-AU",
    p_factory_version: "schema-stage-evidence-v1",
    p_template_id: "general",
    p_country_code: "AU",
    p_language_tag: "en-AU",
    p_country_profile_status: "registered",
  };

  try {
    const nullBefore = await exactCount(
      admin.from("room_factory_manifests").select("id", { count: "exact", head: true })
        .eq("owner_id", userId).is("encounter_session_id", null),
      "Pre-test null-encounter manifest count",
    );

    const nullCall = async (suffix) => {
      const result = await caller.rpc("create_room_factory_room_atomic", {
        ...baseArgs,
        p_encounter_session_id: null,
        p_room_name: `RC non-encounter ${suffix}`,
        p_manifest: { evidence: "schema-stage-null-encounter", suffix, disposable: true },
      });
      if (result.error) throw new Error(`Null-encounter RPC ${suffix} failed: ${result.error.message}`);
      const row = firstRow(result.data);
      assert.equal(row.reused, false, "Null encounter must never report reuse");
      assert.equal(row.manifest_data.encounter_session_id, null, "Null encounter must persist NULL encounter_session_id");
      createdRoomIds.add(row.room_data.id);
      return row;
    };

    const firstNull = await nullCall("A");
    const secondNull = await nullCall("B");
    assert.notEqual(firstNull.room_data.id, secondNull.room_data.id, "Independent null-encounter calls must create distinct Rooms");
    assert.notEqual(firstNull.manifest_data.id, secondNull.manifest_data.id, "Independent null-encounter calls must create distinct manifests");

    const nullAfter = await exactCount(
      admin.from("room_factory_manifests").select("id", { count: "exact", head: true })
        .eq("owner_id", userId).is("encounter_session_id", null),
      "Post-test null-encounter manifest count",
    );
    assert.equal(nullAfter - nullBefore, 2, "Expected exactly two new null-encounter manifests");

    const invalidEncounter = randomUUID();
    const invalidRoomName = `RC invalid-null ${invalidEncounter.slice(0, 8)}`;
    const invalid = await caller.rpc("create_room_factory_room_atomic", {
      ...baseArgs,
      p_encounter_session_id: null,
      p_room_name: invalidRoomName,
      p_manifest: { encounterSessionId: invalidEncounter, disposable: true },
    });
    assert.ok(invalid.error, "Null encounter with manifest encounterSessionId unexpectedly succeeded");
    const invalidResidue = await exactCount(
      admin.from("rooms").select("id", { count: "exact", head: true })
        .eq("room_owner_id", userId).eq("name", invalidRoomName),
      "Invalid null-encounter residue count",
    );
    assert.equal(invalidResidue, 0, "Rejected null-encounter request left Room residue");

    const encounterSessionId = randomUUID();
    const encounterArgs = {
      ...baseArgs,
      p_encounter_session_id: encounterSessionId,
      p_room_name: `RC encounter ${encounterSessionId.slice(0, 8)}`,
      p_manifest: { encounterSessionId, evidence: "schema-stage-encounter-reuse", disposable: true },
    };

    const firstEncounterResult = await caller.rpc("create_room_factory_room_atomic", encounterArgs);
    if (firstEncounterResult.error) throw new Error(`Encounter creation failed: ${firstEncounterResult.error.message}`);
    const firstEncounter = firstRow(firstEncounterResult.data);
    createdRoomIds.add(firstEncounter.room_data.id);
    assert.equal(firstEncounter.reused, false, "First encounter call must create");

    const secondEncounterResult = await caller.rpc("create_room_factory_room_atomic", encounterArgs);
    if (secondEncounterResult.error) throw new Error(`Encounter reuse failed: ${secondEncounterResult.error.message}`);
    const secondEncounter = firstRow(secondEncounterResult.data);
    assert.equal(secondEncounter.reused, true, "Second encounter call must reuse");
    assert.equal(firstEncounter.room_data.id, secondEncounter.room_data.id, "Encounter reuse returned a different Room");
    assert.equal(firstEncounter.manifest_data.id, secondEncounter.manifest_data.id, "Encounter reuse returned a different manifest");

    console.log(JSON.stringify({
      ok: true,
      nullEncounter: {
        createdRooms: 2,
        distinctRooms: firstNull.room_data.id !== secondNull.room_data.id,
        persistedNullEncounterIds: true,
        manifestEncounterSmugglingRejected: true,
        rejectedRequestResidue: invalidResidue,
      },
      encounter: {
        firstReused: firstEncounter.reused,
        secondReused: secondEncounter.reused,
        stableRoomId: firstEncounter.room_data.id === secondEncounter.room_data.id,
        stableManifestId: firstEncounter.manifest_data.id === secondEncounter.manifest_data.id,
      },
    }, null, 2));
  } finally {
    for (const roomId of createdRoomIds) {
      await admin.from("room_factory_manifests").delete().eq("room_id", roomId).eq("owner_id", userId);
      await admin.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
      await admin.from("rooms").delete().eq("id", roomId).eq("room_owner_id", userId);
    }
    if (userId) {
      const memberships = await admin.from("household_members").select("household_id").eq("user_id", userId);
      for (const membership of memberships.data ?? []) {
        const roomCount = await exactCount(
          admin.from("rooms").select("id", { count: "exact", head: true }).eq("household_id", membership.household_id),
          "Cleanup household Room count",
        );
        await admin.from("household_members").delete().eq("household_id", membership.household_id).eq("user_id", userId);
        if (roomCount === 0) {
          await admin.from("households").delete().eq("id", membership.household_id).eq("owner_id", userId);
        }
      }
      await admin.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
