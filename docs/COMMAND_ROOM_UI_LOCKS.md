# Command Room UI Lock Policy

## Owner-approved lock rule

When Harry confirms an area is correct with wording such as "good", "no issue", "completed", or equivalent, that area becomes LOCKED.

A later task must not change a LOCKED framework area unless Harry explicitly asks to change that same area.

LOCKED does not mean customers lose supported customization. Customer choices must remain changeable through approved preference/configuration/locale/country-overlay paths without editing the shared RC Master framework.

Before every Command Room UI pull request:

1. Limit changes to the files/components required by the current order.
2. Do not use unrelated cleanup, refactoring, formatting, or design changes in LOCKED areas.
3. Verify the PR diff contains no unintended modifications to LOCKED files/components.
4. Preview-build before merge.
5. For a LOCKED surface, obtain explicit owner approval, keep Single Writer, and record a rollback SHA before Production merge.

## Current protected areas

- `src/app/rooms/[id]/ChatHistorySidebar.tsx` — left conversation mailbox controls (Select All, SAVE, DELETE, title editing, row selection/delete). Do not modify unless Harry explicitly asks for a left-sidebar change.
- `src/app/rooms/[id]/RoomV3.tsx` — native Command Room chat composer/textarea layout and shared Room shell. Do not modify for unrelated sidebar, menu, persistence, language, search, Header, or AI Dock work.
- `public/rc-compact-ai-dock.js` — Compact AI Dock presentation/visibility/order owner. Do not duplicate its shared Master presentation logic in country/customer-specific code.
- `src/app/rooms/[id]/FirstRoomWelcome.tsx` — First Room welcome visibility owner. The welcome prompt is conditional UI and must not be reintroduced by unrelated code.

## Header / AI Dock contract

The detailed Header / AI Dock safety contract is `docs/RC_MASTER_HEADER_AI_DOCK_UI_LOCK_V1.md`.

Its core distinction is mandatory:

- **Framework lock:** shared geometry, ownership, required controls, layout contract, selection-state presentation, and cross-country Master behavior are protected.
- **Customer freedom:** supported AI selection/order, language/locale, and other documented customer preferences remain changeable through configuration/preference paths.

## Country Edition rule

RC Master shared UI is the source of truth. RCA and other Country Editions inherit shared Header / AI Dock framework behavior. Country differences belong in Country Pack / Policy / Configuration / Locale Overlay and must not recreate the shared UI implementation.

## Current exception

`public/rc-question-rules-v2.js` may add question numbering/date/time/search behaviour, but it must not inject a second text-entry field or replace/resize the native RoomV3 textarea.
