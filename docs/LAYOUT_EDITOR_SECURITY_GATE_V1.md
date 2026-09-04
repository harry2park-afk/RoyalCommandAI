# Layout Editor Security Gate v1

## Goal
Restrict Royal Command Layout Editor to registered administrator devices only, initially the owner's tablet and laptop.

## Access model
- Normal RC/RCA sign-in remains unchanged.
- `/layout-editor` requires an administrator account.
- First trusted-device registration requires administrator password re-authentication and a platform WebAuthn credential with user verification.
- After at least one trusted device exists, a new/replacement laptop also requires a 10-minute one-time enrollment code generated from an already trusted, unlocked device.
- An unregistered browser cannot mount the Layout Editor overlay or save layout changes.
- A trusted browser must complete passkey/biometric verification for a short 20-minute editor session.
- `Finish & Lock` removes edit mode and the security wrapper immediately invalidates the editor session.

## Device binding
A trusted device has both:
1. a registered WebAuthn credential/public key; and
2. a random HttpOnly device token whose SHA-256 hash is stored server-side.

This prevents a synchronized passkey alone from turning an unregistered browser into a trusted Layout Editor browser.

## Biometric privacy
Royal Command never receives or stores fingerprint/face templates. The platform authenticator performs local user verification and the server stores only the public credential material and device registration metadata.

## Server-side storage
- `layout_editor_trusted_devices`
- `layout_editor_sessions`
- `layout_editor_enrollment_codes`
- `layout_editor_audit_log`

All four tables have RLS enabled and direct `anon`/`authenticated` privileges revoked. Server operations use the existing server-only Supabase service-role credential.

## Fail-closed rules
- Missing server security credentials => deny.
- Unsupported origin => deny. Production passkeys are scoped to `royalcommand.ai` / `www.royalcommand.ai`.
- Missing/revoked device token => deny.
- Missing/expired editor session => deny.
- Invalid WebAuthn challenge, RP ID hash, user-verification flag, signature, or counter => deny.
- Layout preference writes require the trusted-device session in addition to admin role.

## Laptop replacement
1. Unlock Layout Editor on the trusted tablet.
2. Generate `Add / Replace Laptop` one-time code.
3. On the new laptop, sign in to RC, open `/layout-editor`, enter the one-time code and administrator password, then register the laptop platform passkey.
4. From the trusted tablet/new laptop, revoke the old laptop.

## Recovery
If all trusted devices are lost, the gate intentionally fails closed. Recovery requires an administrative security recovery procedure rather than silently allowing password-only editor access.
