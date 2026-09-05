import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.RC_ROUTE_SMOKE_SUPABASE_URL;
const anonKey = process.env.RC_ROUTE_SMOKE_ANON_KEY;
const serviceRoleKey = process.env.RC_ROUTE_SMOKE_SERVICE_ROLE_KEY;
const appBaseUrl = process.env.RC_ROUTE_SMOKE_APP_URL || "http://127.0.0.1:3000";
const email = process.env.RC_ROUTE_SMOKE_TEST_EMAIL;
const password = process.env.RC_ROUTE_SMOKE_TEST_PASSWORD;

function requireValue(name, value) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requireLocalhost(name, value) {
  const url = new URL(requireValue(name, value));
  if (!(["127.0.0.1", "localhost"].includes(url.hostname) && process.env.RC_ROUTE_SMOKE_ALLOW_LOCALHOST === "1")) {
    throw new Error(`${name} must be an explicitly allowed localhost URL. Refusing non-isolated route smoke.`);
  }
  return url.toString().replace(/\/$/, "");
}

const isolatedSupabaseUrl = requireLocalhost("RC_ROUTE_SMOKE_SUPABASE_URL", supabaseUrl);
const isolatedAppUrl = requireLocalhost("RC_ROUTE_SMOKE_APP_URL", appBaseUrl);
requireValue("RC_ROUTE_SMOKE_ANON_KEY", anonKey);
requireValue("RC_ROUTE_SMOKE_SERVICE_ROLE_KEY", serviceRoleKey);
requireValue("RC_ROUTE_SMOKE_TEST_EMAIL", email);
requireValue("RC_ROUTE_SMOKE_TEST_PASSWORD", password);

const admin = createSupabaseClient(isolatedSupabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createdUser = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: "RC Route Smoke Owner",
    default_language: "en-AU",
    country_code: "AU",
  },
});
if (createdUser.error || !createdUser.data.user) {
  throw new Error(`Unable to create isolated route-smoke user: ${createdUser.error?.message || "unknown error"}`);
}
const userId = createdUser.data.user.id;

const cookieJar = new Map();
const authClient = createServerClient(isolatedSupabaseUrl, anonKey, {
  cookies: {
    getAll() {
      return [...cookieJar.entries()].map(([name, value]) => ({ name, value }));
    },
    setAll(cookiesToSet) {
      for (const { name, value } of cookiesToSet) cookieJar.set(name, value);
    },
  },
});

const signIn = await authClient.auth.signInWithPassword({ email, password });
if (signIn.error || !signIn.data.session) {
  throw new Error(`Unable to sign in isolated route-smoke user: ${signIn.error?.message || "unknown error"}`);
}

const cookieHeader = [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
if (!cookieHeader) throw new Error("Authenticated route smoke did not produce Supabase SSR cookies.");

const routeUrl = `${isolatedAppUrl}/api/room-factory/rooms`;
async function post(body, authenticated = true) {
  const response = await fetch(routeUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authenticated ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(body),
  });
  let json;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { response, json };
}

function assertStatus(label, actual, expected, body) {
  if (actual !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, received ${actual}: ${JSON.stringify(body)}`);
  }
}

async function ownerCounts() {
  const [rooms, manifests] = await Promise.all([
    admin.from("rooms").select("id", { count: "exact", head: true }).eq("room_owner_id", userId),
    admin.from("room_factory_manifests").select("id", { count: "exact", head: true }).eq("owner_id", userId),
  ]);
  if (rooms.error) throw rooms.error;
  if (manifests.error) throw manifests.error;
  return { rooms: rooms.count || 0, manifests: manifests.count || 0 };
}

const unauthorized = await post({ templateId: "custom", countryCode: "AU", encounterSessionId: randomUUID() }, false);
assertStatus("unauthorized route", unauthorized.response.status, 401, unauthorized.json);

const invalidEncounter = await post({ templateId: "custom", countryCode: "AU", encounterSessionId: "not-a-uuid" });
assertStatus("invalid encounter route", invalidEncounter.response.status, 400, invalidEncounter.json);

const encounterSessionId = randomUUID();
const first = await post({ templateId: "custom", countryCode: "AU", encounterSessionId });
assertStatus("first encounter creation", first.response.status, 201, first.json);
if (first.json?.reused !== false || !first.json?.room?.id || !first.json?.manifest?.id) {
  throw new Error(`First encounter creation did not return a newly persisted Room/manifest: ${JSON.stringify(first.json)}`);
}

const replay = await post({ templateId: "custom", countryCode: "AU", encounterSessionId });
assertStatus("encounter replay", replay.response.status, 200, replay.json);
if (replay.json?.reused !== true) throw new Error(`Encounter replay was not marked reused: ${JSON.stringify(replay.json)}`);
if (replay.json?.room?.id !== first.json.room.id || replay.json?.manifest?.id !== first.json.manifest.id) {
  throw new Error("Encounter replay did not return the authoritative original Room and manifest.");
}

const { data: encounterRows, error: encounterRowsError } = await admin
  .from("room_factory_manifests")
  .select("id, room_id, encounter_session_id")
  .eq("owner_id", userId)
  .eq("encounter_session_id", encounterSessionId);
if (encounterRowsError) throw encounterRowsError;
if (encounterRows?.length !== 1 || encounterRows[0].id !== first.json.manifest.id || encounterRows[0].room_id !== first.json.room.id) {
  throw new Error(`Encounter persistence is not singular/authoritative: ${JSON.stringify(encounterRows)}`);
}

const nonEncounter = await post({ templateId: "custom", countryCode: "AU" });
assertStatus("non-encounter legacy creation", nonEncounter.response.status, 201, nonEncounter.json);
if (nonEncounter.json?.reused !== false || !nonEncounter.json?.room?.id || !nonEncounter.json?.manifest?.id) {
  throw new Error(`Non-encounter route did not preserve existing creation behavior: ${JSON.stringify(nonEncounter.json)}`);
}
if (nonEncounter.json.room.id === first.json.room.id) {
  throw new Error("Non-encounter creation unexpectedly reused the encounter-backed Room.");
}

const beforeFailure = await ownerCounts();
const failureEncounter = randomUUID();
const inaccessibleHouseholdId = randomUUID();
const denied = await post({
  templateId: "custom",
  countryCode: "AU",
  encounterSessionId: failureEncounter,
  householdId: inaccessibleHouseholdId,
});
assertStatus("inaccessible household failure", denied.response.status, 500, denied.json);
const afterFailure = await ownerCounts();
if (afterFailure.rooms !== beforeFailure.rooms || afterFailure.manifests !== beforeFailure.manifests) {
  throw new Error(`Failed atomic route left residue: before=${JSON.stringify(beforeFailure)} after=${JSON.stringify(afterFailure)}`);
}
const { count: failedEncounterCount, error: failedEncounterError } = await admin
  .from("room_factory_manifests")
  .select("id", { count: "exact", head: true })
  .eq("owner_id", userId)
  .eq("encounter_session_id", failureEncounter);
if (failedEncounterError) throw failedEncounterError;
if ((failedEncounterCount || 0) !== 0) throw new Error("Failed atomic route left an encounter manifest residue.");

console.log(JSON.stringify({
  ok: true,
  authenticated: true,
  unauthorizedStatus: unauthorized.response.status,
  invalidEncounterStatus: invalidEncounter.response.status,
  creatorStatus: first.response.status,
  replayStatus: replay.response.status,
  sameAuthoritativeRoom: replay.json.room.id === first.json.room.id,
  sameAuthoritativeManifest: replay.json.manifest.id === first.json.manifest.id,
  nonEncounterStatus: nonEncounter.response.status,
  failureStatus: denied.response.status,
  zeroFailureResidue: true,
}, null, 2));
