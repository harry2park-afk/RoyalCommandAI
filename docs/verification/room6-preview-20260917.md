# Room6 Preview candidate — 2026-09-17

Status: IMPLEMENTED CANDIDATE, NOT CERTIFIED READY. This is the presentation/attachment foundation, not proof of the complete Level 6 product.

## Scope and authority

- STANDARD work lane: new Room6 page, presentation schema, private design storage endpoint, narrow tests. One writer, independent reviewer.
- User authorized developing Room6 from existing rooms and making secretary an optional movable button.
- No Production/master changes, DB schema changes, billing, provider configuration, Retell changes, or legacy room/design mutations.
- `/room6?room=<existing owned room UUID>` attaches the same runtime UI to an existing room without manufacturing another room or copying customer data.
- Optional secretary action is a fixed `/secretary` destination, independent of the selected work-room ID. It currently opens the existing secretary selector. Account-wide direct secretary binding is not yet implemented.

## Implemented

- Allowlisted stable action IDs, editable labels, bounded placement/size/colour/background transparency.
- No-picture mode, colour backgrounds, bounded raster upload, presentation-only export/import.
- Save/cancel/default layout and apply saved presentation to a second owned room.
- Cloud design objects separated from `room_ui_designs`: private `matter-documents` bucket, owner/room prefix, versioned plain-text serialized JSON. Existing bucket allows text/plain, not application/json.
- Server enforces owner and Preview scope. Strict schema rejects executable/permission/credential/URL fields.
- Expected revision plus unique next object name and `upsert:false` prevents concurrent overwrite. Reset creates another revision. Existing revisions are preserved by the app; bucket owner privileges mean this is not WORM storage.
- Editing freezes during saves/imports and disables client navigation to avoid losing in-flight edits.
- Existing IndependentAIRooms is lazy loaded unchanged. Its existing provider connections/histories are reused. No live provider is called simply by decorating or copying a design.

## Verification

- Presentation/storage tests: 8 passed (including concurrent writer, corruption, owner/room prefix separation, action injection).
- Route tests cover production denial, unauthenticated denial, other-owner denial, executable config rejection, stale conflict.
- Next build/typecheck passed after initial implementation. Scoped lint passed.
- Independent review found and writer fixed editing-during-save and client-navigation draft-loss cases.

## Release blockers — do not claim plug-and-play completion

- Authenticated preview browser currently remains at login; no actual owner session available to verify save/reload/copy/device flows.
- Actual storage access with a customer session, browser desktop/mobile editing and latest-source deployment still need verification.
- Existing independent AI runtime was reused, not repaired in this change. Its nonstreaming response, per-connector retry behavior, and previously reported voice failure remain unverified/unresolved.
- Full Level6 module/entitlement matrix, direct personal secretary binding, missing provider integration and end-to-end microphone success are not implemented by this shell.
- Do not call configured providers healthy without a successful functional probe. No certification record or ready flag is written.
- UI displays Preview / function verification pending. No paid release approval is implied.

## Rollback

Remove the new route/client/modules or stop using `/room6`; original `/rooms/*`, secretary, telephone and data remain unchanged. Existing private presentation revision files can remain without affecting legacy pages.
