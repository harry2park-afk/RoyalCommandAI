# Layout Editor Security Gate v1

## Goal
Restrict Royal Command Layout Editor to registered administrator devices only, initially the owner's tablet and laptop.

## Access model
- Normal RC/RCA sign-in remains unchanged.
- `/layout-editor` requires an administrator account.
- First trusted-device registration requires administrator password re-authentication followed by a platform passkey ceremony verified by Supabase Auth.
- After at least one trusted device exists, a new/replacement laptop also requires a 10-minute one-time enrollment code generated from an already trusted, unlocked device.
- An unregistered browser cannot mount the Layout Editor overlay or save layout changes.
- A trusted browser must use the passkey bound to that device before the server creates a short 20-minute editor session.
- `Finish & Lock` removes edit mode and the security wrapper immediately invalidates the editor session.

## WebAuthn verification authority
Royal Command does not implement its own WebAuthn attestation/assertion cryptography in v1. The existing Supabase Auth passkey feature is the verification authority. Supabase Auth runs and verifies the WebAuthn registration and authentication ceremonies; Royal Command binds the resulting verified Supabase passkey ID to a trusted Layout Editor device.

This reduces custom cryptographic surface and keeps the relying-party configuration centralized in `supabase/config.toml` (`royalcommand.ai`).

## Device binding
A trusted Layout Editor device requires both:
1. a Supabase-verified passkey ID registered for the administrator account; and
2. a random HttpOnly device token whose SHA-256 hash is stored server-side.

A synchronized passkey on another browser is therefore not enough by itself to make that browser a trusted Layout Editor device.

## Biometric privacy
Royal Command never receives or stores fingerprint/face templates or private passkey material. The platform authenticator performs local user verification. Supabase Auth stores and verifies the passkey public credential; Royal Command stores only the Supabase passkey ID plus trusted-device/session metadata.

## Server-side storage
- `layout_editor_trusted_devices`
- `layout_editor_sessions`
- `layout_editor_enrollment_codes`
- `layout_editor_audit_log`

All four tables have RLS enabled and direct `anon`/`authenticated` privileges revoked. Server operations use the existing server-only Supabase service-role credential.

## Fail-closed rules
- Missing server security credentials => deny.
- Passkey not verified/known by Supabase Auth => deny.
- Missing/revoked trusted-device token => deny.
- Missing/expired editor session => deny.
- The passkey bound to the current device must have a fresh successful Supabase Auth use before unlock.
- New/replacement device registration requires a newly registered Supabase passkey plus password re-auth; after bootstrap it also requires a valid one-time enrollment code.
- Layout preference writes require admin role + trusted device + live editor session.

## Laptop replacement
1. Unlock Layout Editor on the trusted tablet.
2. Generate `Add / Replace Laptop` one-time code.
3. On the new laptop, sign in to RC, open `/layout-editor`, enter the one-time code and administrator password, then register the laptop passkey through Supabase Auth.
4. From the trusted tablet/new laptop, revoke the old laptop. The editor binding is revoked immediately and the associated Layout Editor passkey is also removed from Supabase Auth when that deletion succeeds.

## Recovery
If all trusted devices are lost, the gate intentionally fails closed. Recovery requires an administrative security recovery procedure rather than silently allowing password-only editor access.
