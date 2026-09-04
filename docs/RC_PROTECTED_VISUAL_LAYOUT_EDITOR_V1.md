# RC Protected Visual Layout Editor v1

## Status
Implementation candidate for Work Queue #680 / implementation ticket #681. This document defines the v1 contract and safety boundary.

## Purpose
Provide a fast, visual way to adjust registered Room Header controls without repeatedly editing hard-coded layout numbers. Normal operation is LOCKED. Layout editing is explicit and one element at a time.

## Access
- Permanent administrator entry route: `/layout-editor`
- Room Header editor route: `/rooms/rca?layoutEdit=1`
- Normal Room route remains locked and has no drag/resize handles.
- Server-side profile role must be `admin`; non-admin users are redirected and cannot persist layout configuration through the API.

## v1 interaction contract
1. Open Layout Editor.
2. Select exactly one visible registered control.
3. Drag the selected control to adjust its visual offset inside the protected 92px Room Header zone.
4. Resize with the eight edge/corner handles where allowed.
5. For approved text controls, edit the label and/or font size numerically.
6. Press Enter or `Save This Button` to validate and persist only that button's draft.
7. `Cancel This Button` restores the last saved configuration.
8. `Reset This Button` removes the saved override for that control and restores the Core layout after Save.
9. `Finish & Lock` exits Edit Mode and removes all editing handles.

## Source of truth
The editor does not persist arbitrary DOM order or raw `left/top` values. The Core layout remains the base layout. The saved Layout Config contains allow-listed element overrides only:

- stable `element_id`
- constrained visual `offsetX/offsetY`
- constrained `width/height`
- constrained `fontSize`
- optional approved `label`
- version/timestamp metadata

The runtime applies the verified server-backed config as a projection over the Core UI. LocalStorage is cache only and is never trusted for editor authorization or as the authoritative saved layout. Existing Room logic, AI provider selection, language behavior and DOM ordering are not rewritten by the editor.

## One-at-a-time rule
Only one registered control can be selected and edited at any time. While one control is selected, attempts to select another are blocked until the current control is explicitly saved or cancelled.

## Allow-list
v1 registers the Room Header controls needed for the current RC/RCA pilot: Build Your Room, Integrated Answer, AI Warehouse, default top AI controls including Codex, and Profile. Unknown DOM ids are rejected by the config sanitizer and cannot be persisted.

The language control is intentionally excluded from the generic editor. It has dedicated owner files and remains protected from a second layout owner. Any future language-control layout editing must be delegated through that existing owner rather than by generic DOM control.

AI provider names are not text-editable in v1 because the compact AI dock uses stable provider names for visibility/persistence. Their size and font can be adjusted within constraints without changing provider identity.

## Safety constraints
- Room Header editing zone: y=0..92px.
- Position is clamped to the viewport and protected header zone.
- Width/height are clamped per element.
- Font size is clamped to 8..32px.
- Approved label overrides are trimmed and limited to 80 characters.
- Overlap with another visible registered control blocks Save.
- Save failure keeps the selected control in Edit Mode.
- Normal Room use has no edit listeners or handles.
- Existing Core order and business logic remain authoritative.
- No generic editor ownership of the language control.
- Server role verification is repeated on every layout save.

## Persistence
- Account-backed persistence: `profiles.ui_preferences.layoutRoomHeaderV1` through the existing authenticated user-preferences API.
- The save path rejects non-admin profiles with HTTP 403.
- LocalStorage is a browser cache only.
- This v1 candidate stores the administrator's reviewed layout as a user-scoped pilot. It does not create a shared Master-wide database write path.

## Master / Country / User roadmap
The schema intentionally leaves shared Master/Country deployment separate from the user-scoped v1 editor. A later controlled step can promote a reviewed config to Master or Country Overlay without making browser-side UI editing a direct Production deployment mechanism.

## Explicit non-goals in v1
- No arbitrary DOM editing.
- No free canvas persistence.
- No automatic Master-wide deployment from the browser.
- No Country Pack activation.
- No database schema migration.
- No multi-element selection.
- No generic editing of the language control.
- No AI provider-name override.
- No change to AI provider availability or saved AI visibility.
- No change to Room identity, history, memory, auth, billing or customer data boundaries.

## Rollback
Remove `layoutRoomHeaderV1` from the administrator's UI preferences or use `Reset This Button` for each override. Repository rollback point for this candidate is master `eb6cd6b8edfdc73a79ac0654049b8182ae06278e`.
