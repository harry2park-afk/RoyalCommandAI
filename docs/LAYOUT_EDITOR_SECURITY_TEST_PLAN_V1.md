# Layout Editor Security Gate v1 — Verification Plan

1. Exact-head CI must pass: Conflict Guard, Change Control, Quality Gate.
2. Apply additive database migration before Production cutover; re-run Supabase security/performance advisors.
3. Vercel Preview must be READY on the exact PR head.
4. Unauthenticated `/layout-editor` redirects to login.
5. Non-admin `/layout-editor` is denied.
6. First admin device registration requires password re-auth plus platform WebAuthn user verification.
7. Once one trusted device exists, an unregistered browser cannot register without a valid 10-minute enrollment code.
8. Trusted tablet/laptop can unlock with only its own registered credential and device cookie.
9. Synced/passkey credential without the registered device cookie must not unlock another browser.
10. `/rooms/rca?layoutEdit=1` from an untrusted or locked browser redirects to `/layout-editor` and does not mount editing controls.
11. Layout preference PATCH with a layout config fails unless admin + trusted device + live editor session are all present.
12. `Finish & Lock` removes edit mode and invalidates the session; subsequent layout writes fail until passkey unlock.
13. Device revocation invalidates its sessions immediately.
14. Replacement-laptop flow: trusted tablet generates code -> new laptop password re-auth -> new laptop platform credential -> old laptop revoke.
15. Tablet touch verification: select one button, drag, resize handles, numeric controls, Save, Cancel, Undo, Reset, Finish & Lock.
16. Normal RCA Room without `layoutEdit=1` remains visually/functionally unchanged.
17. Post-deploy runtime errors checked; rollback point recorded.
