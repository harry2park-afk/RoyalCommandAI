#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Production is deliberately hard-blocked. This harness exists only to generate
// real two-session evidence against a disposable/isolated Supabase environment
// where the candidate migration has already been applied.
const PRODUCTION_PROJECT_REF = "aygawkavujjmybekswrg";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function projectIdentityFromUrl(rawUrl) {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();
  const hostedMatch = hostname.match(/^([a-z0-9-]+)\.supabase\.co$/);
  if (hostedMatch) {
    return { projectRef: hostedMatch[1], local: false };
  }

  if (hostname === "127.0.0.1" || hostname === "localhost") {
    if (process.env.RC_CONCURRENCY_ALLOW_LOCALHOST !== "1") {
      throw new Error("Local Supabase URL requires RC_CONCURRENCY_ALLOW_LOCALHOST=1");
    }
    return { projectRef: "local-ci", local: true };
  }

  throw new Error(`Expected an isolated *.supabase.co URL or explicitly enabled local Supabase URL, received ${hostname}`);
}

function adminClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function userClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Test-user sign-in failed: ${error.message}`);
  assert.ok(data.user?.id, "Test-user sign-in returned no user id");
  return data.user.id;
}

function firstRpcRow(data) {
  const row = Array.isArray(data) ? data[0] : data;
  assert.ok(row, "Atomic RPC returned no row");
  assert.ok(row.room_data?.id, "Atomic RPC returned no Room id");
  assert.ok(row.manifest_data?.id, "Atomic RPC returned no manifest id");
  assert.equal(typeof row.reused, "boolean", "Atomic RPC returned no reused boolean");
  return row;
}

async function exactCount(query, label) {
  const { count, error } = await query;
  if (error) throw new Error(`${label} count failed: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const url = required("RC_CONCURRENCY_SUPABASE_URL");
  const anonKey = required("RC_CONCURRENCY_ANON_KEY");
  const serviceRoleKey = required("RC_CONCURRENCY_SERVICE_ROLE_KEY");
  const email = required("RC_CONCURRENCY_TEST_EMAIL");
  const password = required("RC_CONCURRENCY_TEST_PASSWORD");

  const { projectRef, local } = projectIdentityFromUrl(url);
  if (projectRef === PRODUCTION_PROJECT_REF) {
    throw new Error("Refusing to run Room Factory concurrency evidence against the Production Supabase project.");
  }

  const admin = adminClient(url, serviceRoleKey);
  const callerA = userClient(url, anonKey);
  const callerB = userClient(url, anonKey);
  let createdTestUserId = null;

  if (local) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`Local test-user creation failed: ${error.message}`);
    assert.ok(data.user?.id, "Local test-user creation returned no user id");
    createdTestUserId = data.user.id;
  }

  const [ownerA, ownerB] = await Promise.all([
    signIn(callerA, email, password),
    signIn(callerB, email, password),
  ]);
  assert.equal(ownerA, ownerB, "Independent callers must authenticate as the same test owner");

  const ownerId = ownerA;
  const encounterSessionId = randomUUID();
  const roomName = `RC concurrency ${encounterSessionId.slice(0, 8)}`;
  let createdRoomId = null;
  let createdHouseholdId = null;
  let rollbackEvidence = null;

  const { data: preMembershipRows, error: preMembershipError } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", ownerId)
    .limit(1);
  if (preMembershipError) throw new Error(`Pre-test household lookup failed: ${preMembershipError.message}`);
  const hadHouseholdMembershipBeforeTest = (preMembershipRows?.length ?? 0) > 0;

  const args = {
    p_encounter_session_id: encounterSessionId,
    p_household_id: null,
    p_household_name: "Room Factory concurrency evidence",
    p_room_name: roomName,
    p_room_description: "Disposable isolated concurrency evidence Room",
    p_language_pref: "en-AU",
    p_factory_version: "concurrency-evidence-v1",
    p_template_id: "general",
    p_country_code: "AU",
    p_language_tag: "en-AU",
    p_country_profile_status: "registered",
    p_manifest: {
      encounterSessionId,
      evidence: "two-independent-callers",
      disposable: true,
    },
  };

  try {
    // The CI fixture can install a local-only trigger that rejects a marked
    // manifest *after* Household/Room/member inserts have occurred. The RPC is
    // one database transaction, so the rejection must leave zero new residue.
    if (process.env.RC_CONCURRENCY_FORCE_ROLLBACK_TEST === "1") {
      const rollbackEncounterId = randomUUID();
      const rollbackRoomName = `RC rollback ${rollbackEncounterId.slice(0, 8)}`;
      const beforeHouseholds = await exactCount(
        admin.from("households").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
        "Pre-rollback Household",
      );
      const beforeMemberships = await exactCount(
        admin.from("household_members").select("household_id", { count: "exact", head: true }).eq("user_id", ownerId),
        "Pre-rollback Household membership",
      );

      const rollbackResult = await callerA.rpc("create_room_factory_room_atomic", {
        ...args,
        p_encounter_session_id: rollbackEncounterId,
        p_room_name: rollbackRoomName,
        p_manifest: {
          encounterSessionId: rollbackEncounterId,
          evidence: "forced-transaction-rollback",
          forceRollback: true,
          disposable: true,
        },
      });
      assert.ok(rollbackResult.error, "Forced downstream manifest failure unexpectedly succeeded");

      const afterManifests = await exactCount(
        admin.from("room_factory_manifests").select("id", { count: "exact", head: true })
          .eq("owner_id", ownerId).eq("encounter_session_id", rollbackEncounterId),
        "Post-rollback manifest residue",
      );
      const afterRooms = await exactCount(
        admin.from("rooms").select("id", { count: "exact", head: true })
          .eq("room_owner_id", ownerId).eq("name", rollbackRoomName),
        "Post-rollback Room residue",
      );
      const afterHouseholds = await exactCount(
        admin.from("households").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
        "Post-rollback Household",
      );
      const afterMemberships = await exactCount(
        admin.from("household_members").select("household_id", { count: "exact", head: true }).eq("user_id", ownerId),
        "Post-rollback Household membership",
      );

      assert.equal(afterManifests, 0, "Forced failure left a manifest residue");
      assert.equal(afterRooms, 0, "Forced failure left a Room residue");
      assert.equal(afterHouseholds, beforeHouseholds, "Forced failure changed Household count");
      assert.equal(afterMemberships, beforeMemberships, "Forced failure changed Household membership count");

      rollbackEvidence = {
        forcedFailureObserved: true,
        manifestResidue: afterManifests,
        roomResidue: afterRooms,
        householdDelta: afterHouseholds - beforeHouseholds,
        householdMembershipDelta: afterMemberships - beforeMemberships,
      };
    }

    // Separate Supabase clients issue simultaneous HTTP RPC requests. Each RPC is
    // its own database transaction, exercising the advisory transaction lock and
    // authoritative owner/encounter uniqueness boundary under real overlap.
    const [resultA, resultB] = await Promise.all([
      callerA.rpc("create_room_factory_room_atomic", args),
      callerB.rpc("create_room_factory_room_atomic", args),
    ]);

    if (resultA.error) throw new Error(`Concurrent caller A failed: ${resultA.error.message}`);
    if (resultB.error) throw new Error(`Concurrent caller B failed: ${resultB.error.message}`);

    const rowA = firstRpcRow(resultA.data);
    const rowB = firstRpcRow(resultB.data);

    assert.equal(rowA.room_data.id, rowB.room_data.id, "Concurrent callers resolved to different Rooms");
    assert.equal(rowA.manifest_data.id, rowB.manifest_data.id, "Concurrent callers resolved to different manifests");
    assert.deepEqual(
      [rowA.reused, rowB.reused].sort(),
      [false, true],
      "Expected exactly one creator and one reuse result",
    );

    createdRoomId = rowA.room_data.id;
    createdHouseholdId = rowA.room_data.household_id ?? null;

    const { data: manifests, error: manifestError } = await admin
      .from("room_factory_manifests")
      .select("id,room_id,owner_id,encounter_session_id")
      .eq("owner_id", ownerId)
      .eq("encounter_session_id", encounterSessionId);
    if (manifestError) throw new Error(`Manifest verification failed: ${manifestError.message}`);
    assert.equal(manifests?.length, 1, "Authoritative owner/encounter boundary did not persist exactly one manifest");
    assert.equal(manifests[0].room_id, createdRoomId, "Persisted manifest points to a different Room");

    const { data: rooms, error: roomError } = await admin
      .from("rooms")
      .select("id,room_owner_id,household_id")
      .eq("id", createdRoomId)
      .eq("room_owner_id", ownerId);
    if (roomError) throw new Error(`Room verification failed: ${roomError.message}`);
    assert.equal(rooms?.length, 1, "Expected exactly one persisted owned Room");

    const { data: members, error: memberError } = await admin
      .from("room_members")
      .select("room_id,user_id,role")
      .eq("room_id", createdRoomId)
      .eq("user_id", ownerId);
    if (memberError) throw new Error(`Room-member verification failed: ${memberError.message}`);
    assert.equal(members?.length, 1, "Expected exactly one owner membership for the persisted Room");

    console.log(JSON.stringify({
      ok: true,
      projectRef,
      local,
      ownerId,
      encounterSessionId,
      roomId: createdRoomId,
      manifestId: manifests[0].id,
      rollback: rollbackEvidence,
      callerResults: [
        { reused: rowA.reused, roomId: rowA.room_data.id, manifestId: rowA.manifest_data.id },
        { reused: rowB.reused, roomId: rowB.room_data.id, manifestId: rowB.manifest_data.id },
      ],
      persisted: { rooms: rooms.length, manifests: manifests.length, ownerMembers: members.length },
    }, null, 2));
  } finally {
    // Cleanup is deliberately explicit and service-role-only because this script
    // is for a disposable isolated project. Do not weaken application RLS merely
    // to make the evidence harness self-cleaning.
    if (createdRoomId) {
      await admin.from("room_factory_manifests").delete().eq("room_id", createdRoomId).eq("owner_id", ownerId);
      await admin.from("room_members").delete().eq("room_id", createdRoomId).eq("user_id", ownerId);
      await admin.from("rooms").delete().eq("id", createdRoomId).eq("room_owner_id", ownerId);
    }

    if (!hadHouseholdMembershipBeforeTest && createdHouseholdId) {
      await admin.from("household_members").delete().eq("household_id", createdHouseholdId).eq("user_id", ownerId);
      const { count } = await admin
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("household_id", createdHouseholdId);
      if ((count ?? 0) === 0) {
        await admin.from("households").delete().eq("id", createdHouseholdId).eq("owner_id", ownerId);
      }
    }

    if (createdTestUserId) {
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(createdTestUserId);
      if (deleteUserError) {
        console.warn(`Local test-user cleanup failed: ${deleteUserError.message}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
