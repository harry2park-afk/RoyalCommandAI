# RC Master Header / AI Dock UI Lock v1

Status: CANDIDATE SAFETY CONTRACT
Owner: Harry
Scope: RC Master shared Header / AI Dock framework

## Purpose

Protect the approved RC Master Header / AI Dock structure from accidental cross-module changes while keeping customer-facing configuration flexible.

This lock protects the framework. It does not freeze customer choice.

## Framework lock vs customer freedom

### LOCKED framework behavior

The following shared RC Master behavior must not be changed by unrelated work:

- Header and AI Dock structural layout ownership.
- Required top controls and their placement contract.
- AI button geometry source: existing SAVE button visual geometry only; SAVE behavior is not copied.
- AI button spacing: 2px.
- Selected AI visual state, including green border/glow and existing check mark.
- Chat viewport start position and header height contract once recorded as an approved baseline.
- First Room welcome rule: show only when no actual user-created non-Command Room exists; hide once such a Room exists.
- Shared RC Master UI must not be forked into country-specific duplicate implementations.

### CUSTOMER-CHANGEABLE configuration

Customers may change supported preferences without editing shared RC Master UI code. Examples include:

- Which available AI providers are selected or shown, subject to account entitlement and safety policy.
- Allowed AI ordering where the product exposes ordering controls.
- Language / locale selection.
- Other documented user preferences and Country Overlay configuration.

Customer choices must be stored and applied through supported configuration / preference / overlay paths. They must not require copying or editing the shared Header / AI Dock implementation.

## RC MASTER FIRST

- Shared UI framework belongs to RC Master.
- Country Editions such as RCA inherit the shared framework.
- Country differences belong in Country Pack / Policy / Configuration / Locale Overlay.
- A Country Edition must not recreate or override shared Header / AI Dock code merely to express a customer or country preference.

## Locked Surface ownership

Primary owners:

- `public/rc-compact-ai-dock.js` — compact AI Dock visibility/order/presentation owner.
- `src/app/rooms/[id]/RoomV3.tsx` — shared Room shell/layout owner where applicable.
- `src/app/rooms/[id]/FirstRoomWelcome.tsx` — first-room welcome visibility rule.

Reference-only visual source:

- `public/rc-sidebar-actions-compact.js` — SAVE visual geometry may be read/reused by the AI Dock. SAVE behavior remains owned by the sidebar and must not be copied into AI buttons.

## Change classification

- Customer preference changes through an existing supported preference/configuration path: FAST or STANDARD according to data/security impact.
- Copy/text-only changes outside locked geometry: STANDARD.
- Any change to locked Header / AI Dock geometry, ownership, DOM structure, shared runtime behavior, or cross-country framework: HIGH-RISK.

## Required change process for Locked Surfaces

A Locked Surface change requires all of the following:

1. Design first.
2. Explicit Harry approval for that surface.
3. One Single Writer.
4. Exact file/surface scope declared in the PR.
5. No unrelated cleanup/refactor/formatting.
6. GitHub Quality Gate PASS.
7. Conflict Guard PASS.
8. Change Control PASS.
9. Vercel Preview READY.
10. Owner visual smoke test of the affected screen.
11. Rollback SHA recorded before Production merge.
12. Production verification after merge before declaring SUCCESS.

Preview READY alone is never evidence that the UI is correct.

## Required visual smoke checks

For Header / AI Dock changes, verify at minimum:

- No overlap between Royal Command title, slogan, Room title, and controls.
- AI buttons are not collapsed, clipped, or stretched unexpectedly.
- AI button spacing remains 2px unless Harry explicitly approves a new value.
- Selected AI remains visibly green and retains the existing check state.
- `+ Build Your Room`, Room name, Integrated Answer, AI Warehouse, available AI slots, Connect to Room, and language control remain visible where designed.
- Chat viewport begins at the approved position.
- First-room welcome text is hidden when a real non-Command Room exists.

## Country / customer override rule

A country or customer setting may select data, language, enabled providers, order, labels, policy, or other supported configuration. It must not directly replace shared Master Header / AI Dock code.

If a new customer-facing customization is desired but no supported configuration path exists, design and add a configuration contract first; do not create a country/customer fork of the shared component.

## Rollback rule

If a later change breaks a Locked Surface, prefer rollback to the latest owner-approved stable/candidate baseline before adding workaround layers.

## Current approved candidate reference

The visually approved Preview candidate for the SAVE-style AI buttons and corrected First Room welcome behavior is commit:

`a23a4f298ae947cdb483bd20d75d3a52f1b42cd9`

This reference is a candidate only until its PR is merged and Production verification is completed. Production remains unchanged while this safety contract is developed.
