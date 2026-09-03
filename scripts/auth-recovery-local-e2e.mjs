import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = requireLocalhost('RC_AUTH_E2E_SUPABASE_URL', process.env.RC_AUTH_E2E_SUPABASE_URL);
const appUrl = requireLocalhost('RC_AUTH_E2E_APP_URL', process.env.RC_AUTH_E2E_APP_URL);
const anonKey = requireValue('RC_AUTH_E2E_ANON_KEY', process.env.RC_AUTH_E2E_ANON_KEY);
const serviceRoleKey = requireValue('RC_AUTH_E2E_SERVICE_ROLE_KEY', process.env.RC_AUTH_E2E_SERVICE_ROLE_KEY);
const email = requireValue('RC_AUTH_E2E_EMAIL', process.env.RC_AUTH_E2E_EMAIL);
const password = requireValue('RC_AUTH_E2E_PASSWORD', process.env.RC_AUTH_E2E_PASSWORD);
const newPassword = requireValue('RC_AUTH_E2E_NEW_PASSWORD', process.env.RC_AUTH_E2E_NEW_PASSWORD);

function requireValue(name, value) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requireLocalhost(name, value) {
  const url = new URL(requireValue(name, value));
  if (
    process.env.RC_AUTH_E2E_ALLOW_LOCALHOST !== '1' ||
    !['127.0.0.1', 'localhost'].includes(url.hostname)
  ) {
    throw new Error(`${name} must be an explicitly allowed localhost URL.`);
  }
  return url.toString().replace(/\/$/, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,=]+=[^;,]*)/g).map((entry) => entry.trim());
}

function responseCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  return splitSetCookie(response.headers.get('set-cookie'));
}

function absorbCookies(jar, response) {
  for (const raw of responseCookies(response)) {
    const first = raw.split(';', 1)[0];
    const separator = first.indexOf('=');
    if (separator <= 0) continue;
    const name = first.slice(0, separator).trim();
    const value = first.slice(separator + 1).trim();
    if (/Max-Age=0/i.test(raw) || /Expires=Thu, 01 Jan 1970/i.test(raw)) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function appFetch(path, { method = 'GET', body, jar } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (jar?.size) headers.set('cookie', cookieHeader(jar));

  const response = await fetch(`${appUrl}${path}`, {
    method,
    headers,
    redirect: 'manual',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (jar) absorbCookies(jar, response);
  return response;
}

function locationPath(response) {
  const location = response.headers.get('location');
  if (!location) return null;
  const url = new URL(location, appUrl);
  return `${url.pathname}${url.search}`;
}

async function jsonBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let userId = null;

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'RC Auth Recovery E2E' },
  });
  if (created.error || !created.data.user) {
    throw new Error(`Unable to create isolated recovery user: ${created.error?.message || 'unknown error'}`);
  }
  userId = created.data.user.id;

  const known = await appFetch('/api/auth/password-recovery', {
    method: 'POST',
    body: { email },
  });
  const unknown = await appFetch('/api/auth/password-recovery', {
    method: 'POST',
    body: { email: `missing-${Date.now()}@example.test` },
  });
  const knownBody = await jsonBody(known);
  const unknownBody = await jsonBody(unknown);
  assert(known.status === 202, `Known-account recovery request returned ${known.status}`);
  assert(unknown.status === 202, `Unknown-account recovery request returned ${unknown.status}`);
  assert(
    JSON.stringify(knownBody) === JSON.stringify(unknownBody),
    'Recovery request response leaks account existence.',
  );

  const generated = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${appUrl}/auth/recovery/confirm` },
  });
  if (generated.error || !generated.data?.properties?.hashed_token) {
    throw new Error(`Unable to generate local recovery token: ${generated.error?.message || 'missing hashed_token'}`);
  }
  const tokenHash = generated.data.properties.hashed_token;
  assert(/^[A-Za-z0-9_-]{20,512}$/.test(tokenHash), 'Generated recovery token hash does not match app contract.');

  // Mail scanners and link previewers may GET the link. GET must only capture the
  // hash in an HttpOnly cookie; the explicit POST is the token-consumption boundary.
  const scannerJar = new Map();
  const scannerGet = await appFetch(
    `/auth/recovery/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`,
    { jar: scannerJar },
  );
  assert(scannerGet.status === 303, `Recovery GET returned ${scannerGet.status}`);
  assert(locationPath(scannerGet) === '/auth/recovery/continue', 'Recovery GET did not route to explicit-confirm page.');
  assert(scannerJar.get('rc_password_recovery') === tokenHash, 'Recovery GET did not capture token hash in scoped cookie.');

  const secondScannerJar = new Map();
  const secondScannerGet = await appFetch(
    `/auth/recovery/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`,
    { jar: secondScannerJar },
  );
  assert(secondScannerGet.status === 303, `Second recovery GET returned ${secondScannerGet.status}`);
  assert(locationPath(secondScannerGet) === '/auth/recovery/continue', 'Second recovery GET unexpectedly consumed or rejected token.');

  const recoveryJar = scannerJar;
  const confirm = await appFetch('/api/auth/password-recovery/confirm', {
    method: 'POST',
    jar: recoveryJar,
  });
  assert(confirm.status === 303, `Recovery confirmation POST returned ${confirm.status}`);
  assert(locationPath(confirm) === '/account/update-password', 'Valid recovery confirmation did not establish update-password path.');
  assert(!recoveryJar.has('rc_password_recovery'), 'Recovery capture cookie was not cleared after POST consumption.');

  const sessionClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return [...recoveryJar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          if (value) recoveryJar.set(name, value);
          else recoveryJar.delete(name);
        }
      },
    },
  });

  const recoveredUser = await sessionClient.auth.getUser();
  if (recoveredUser.error || recoveredUser.data.user?.id !== userId) {
    throw new Error(`Recovery POST did not preserve an authenticated recovery session: ${recoveredUser.error?.message || 'user mismatch'}`);
  }

  const page = await appFetch('/account/update-password', { jar: recoveryJar });
  assert(page.status === 200, `Authenticated update-password page returned ${page.status} (${locationPath(page) || 'no redirect'}).`);

  // Recovery OTPs are one-time. Re-presenting the same captured token must fail
  // closed even if a client manually reconstructs the capture cookie.
  const reuseJar = new Map([['rc_password_recovery', tokenHash]]);
  const reuse = await appFetch('/api/auth/password-recovery/confirm', {
    method: 'POST',
    jar: reuseJar,
  });
  assert(reuse.status === 303, `Reused recovery token returned ${reuse.status}`);
  assert(
    locationPath(reuse) === '/forgot-password?status=invalid_or_expired',
    `Reused recovery token was not denied: ${locationPath(reuse)}`,
  );

  const updated = await sessionClient.auth.updateUser({ password: newPassword });
  if (updated.error) throw new Error(`Authenticated recovery password update failed: ${updated.error.message}`);
  const signedOut = await sessionClient.auth.signOut();
  if (signedOut.error) throw new Error(`Recovery session sign-out failed: ${signedOut.error.message}`);

  const oldPasswordClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const oldPasswordLogin = await oldPasswordClient.auth.signInWithPassword({ email, password });
  assert(Boolean(oldPasswordLogin.error), 'Old password still signs in after recovery update.');

  const newPasswordClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const newPasswordLogin = await newPasswordClient.auth.signInWithPassword({ email, password: newPassword });
  if (newPasswordLogin.error || newPasswordLogin.data.user?.id !== userId) {
    throw new Error(`New password sign-in failed: ${newPasswordLogin.error?.message || 'user mismatch'}`);
  }
  await newPasswordClient.auth.signOut();

  console.log(
    'Auth recovery local E2E passed: enumeration-resistant request, scanner-safe GET capture, explicit POST consumption, session handoff, one-time reuse denial, password update and recovery-session sign-out.',
  );
} finally {
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) console.warn(`Cleanup warning: ${removed.error.message}`);
  }
}
