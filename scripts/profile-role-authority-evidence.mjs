#!/usr/bin/env node

import assert from "node:assert/strict";
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
    throw new Error("Refusing to run profile-role authority evidence against Production Supabase.");
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Expected disposable localhost Supabase, received ${host}`);
  }
  if (process.env.RC_PROFILE_ROLE_ALLOW_LOCALHOST !== "1") {
    throw new Error("Local profile-role evidence requires RC_PROFILE_ROLE_ALLOW_LOCALHOST=1");
  }
}

function client(url, key) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function main() {
  const url = required("RC_PROFILE_ROLE_SUPABASE_URL");
  const anonKey = required("RC_PROFILE_ROLE_ANON_KEY");
  const serviceRoleKey = required("RC_PROFILE_ROLE_SERVICE_ROLE_KEY");
  const password = required("RC_PROFILE_ROLE_TEST_PASSWORD");
  const suffix = required("RC_PROFILE_ROLE_TEST_SUFFIX");
  assertDisposableUrl(url);

  const admin = client(url, serviceRoleKey);
  const caller = client(url, anonKey);
  const attackerEmail = `rc-role-attacker-${suffix}@example.test`;
  const victimEmail = `rc-role-victim-${suffix}@example.test`;
  let attackerId = null;
  let victimId = null;

  try {
    const signup = await caller.auth.signUp({
      email: attackerEmail,
      password,
      options: {
        data: {
          full_name: "Role authority attacker fixture",
          default_language: "en-AU",
          role: "admin",
        },
      },
    });
    if (signup.error) throw new Error(`User-controlled signup failed: ${signup.error.message}`);
    attackerId = signup.data.user?.id ?? null;
    assert.ok(attackerId, "Signup returned no attacker user id");

    const signIn = await caller.auth.signInWithPassword({ email: attackerEmail, password });
    if (signIn.error) throw new Error(`Attacker sign-in failed: ${signIn.error.message}`);
    assert.equal(signIn.data.user?.id, attackerId, "Signed-in attacker id mismatch");

    const ownProfile = await caller.from("profiles").select("id, role, full_name").eq("id", attackerId).single();
    if (ownProfile.error) throw new Error(`Own profile read failed: ${ownProfile.error.message}`);
    assert.equal(ownProfile.data.role, "client", "Signup metadata minted a privileged profile role");

    const staffEscalation = await caller
      .from("profiles")
      .update({ role: "staff" })
      .eq("id", attackerId)
      .select("role");
    assert.ok(staffEscalation.error, "Authenticated user unexpectedly changed own profile role to staff");

    const afterStaffEscalation = await admin.from("profiles").select("role").eq("id", attackerId).single();
    if (afterStaffEscalation.error) {
      throw new Error(`Post-staff-escalation read failed: ${afterStaffEscalation.error.message}`);
    }
    assert.equal(afterStaffEscalation.data.role, "client", "Rejected staff escalation changed stored role");

    const adminEscalation = await caller
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", attackerId)
      .select("role");
    assert.ok(adminEscalation.error, "Authenticated user unexpectedly changed own profile role to admin");

    const afterAdminEscalation = await admin.from("profiles").select("role").eq("id", attackerId).single();
    if (afterAdminEscalation.error) {
      throw new Error(`Post-admin-escalation read failed: ${afterAdminEscalation.error.message}`);
    }
    assert.equal(afterAdminEscalation.data.role, "client", "Rejected admin escalation changed stored role");

    const normalEdit = await caller
      .from("profiles")
      .update({ full_name: "Normal editable profile value" })
      .eq("id", attackerId)
      .select("full_name")
      .single();
    if (normalEdit.error) throw new Error(`Normal own-profile edit failed: ${normalEdit.error.message}`);
    assert.equal(normalEdit.data.full_name, "Normal editable profile value", "Normal profile edit did not persist");

    const trustedProvision = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", attackerId)
      .select("role")
      .single();
    if (trustedProvision.error) throw new Error(`Trusted role provisioning failed: ${trustedProvision.error.message}`);
    assert.equal(trustedProvision.data.role, "admin", "Trusted provisioning did not assign admin");

    const trustedReset = await admin.from("profiles").update({ role: "client" }).eq("id", attackerId);
    if (trustedReset.error) throw new Error(`Trusted role reset failed: ${trustedReset.error.message}`);

    const victim = await admin.auth.admin.createUser({
      email: victimEmail,
      password,
      email_confirm: true,
      user_metadata: { role: "admin", full_name: "Victim fixture" },
    });
    if (victim.error) throw new Error(`Victim creation failed: ${victim.error.message}`);
    victimId = victim.data.user?.id ?? null;
    assert.ok(victimId, "Victim creation returned no user id");

    const victimProfile = await admin.from("profiles").select("role, full_name").eq("id", victimId).single();
    if (victimProfile.error) throw new Error(`Victim profile read failed: ${victimProfile.error.message}`);
    assert.equal(victimProfile.data.role, "client", "Auth metadata assigned victim a privileged role");
    assert.equal(victimProfile.data.full_name, "Victim fixture", "Victim profile fixture did not preserve expected name");

    const crossRead = await caller.from("profiles").select("id, role").eq("id", victimId);
    if (crossRead.error) throw new Error(`Cross-user read request failed unexpectedly: ${crossRead.error.message}`);
    assert.equal(crossRead.data?.length ?? 0, 0, "Authenticated user could read another user's profile");

    const crossUpdate = await caller
      .from("profiles")
      .update({ full_name: "Cross-tenant overwrite attempt" })
      .eq("id", victimId)
      .select("id, full_name");
    if (!crossUpdate.error) {
      assert.equal(
        crossUpdate.data?.length ?? 0,
        0,
        "Authenticated user unexpectedly updated another user's profile",
      );
    }

    const victimAfterCrossUpdate = await admin
      .from("profiles")
      .select("role, full_name")
      .eq("id", victimId)
      .single();
    if (victimAfterCrossUpdate.error) {
      throw new Error(`Post-cross-user-update read failed: ${victimAfterCrossUpdate.error.message}`);
    }
    assert.equal(victimAfterCrossUpdate.data.role, "client", "Cross-user update changed victim authorization role");
    assert.equal(
      victimAfterCrossUpdate.data.full_name,
      "Victim fixture",
      "Cross-user update changed victim profile data",
    );

    console.log(JSON.stringify({
      ok: true,
      signupMetadataAdminBlocked: true,
      authenticatedSelfStaffElevationBlocked: true,
      rejectedStaffElevationLeftRole: afterStaffEscalation.data.role,
      authenticatedSelfAdminElevationBlocked: true,
      rejectedAdminElevationLeftRole: afterAdminEscalation.data.role,
      normalOwnProfileEditPreserved: true,
      trustedAdminProvisioningPreserved: true,
      secondUserMetadataAdminBlocked: true,
      crossUserProfileReadBlocked: true,
      crossUserProfileUpdateBlocked: true,
    }, null, 2));
  } finally {
    await caller.auth.signOut().catch(() => undefined);
    if (victimId) await admin.auth.admin.deleteUser(victimId);
    if (attackerId) await admin.auth.admin.deleteUser(attackerId);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
