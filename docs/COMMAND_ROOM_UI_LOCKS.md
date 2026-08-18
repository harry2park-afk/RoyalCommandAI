# Command Room UI Lock Policy

## Owner-approved lock rule

When Harry confirms an area is correct with wording such as "good", "no issue", "completed", or equivalent, that area becomes LOCKED.

A later task must not change a LOCKED area unless Harry explicitly asks to change that same area.

Before every Command Room UI pull request:

1. Limit changes to the files/components required by the current order.
2. Do not use unrelated cleanup, refactoring, formatting, or design changes in LOCKED areas.
3. Verify the PR diff contains no unintended modifications to LOCKED files/components.
4. Preview-build before merge.

## Current protected areas

- `src/app/rooms/[id]/ChatHistorySidebar.tsx` — left conversation mailbox controls (Select All, SAVE, DELETE, title editing, row selection/delete). Do not modify unless Harry explicitly asks for a left-sidebar change.
- `src/app/rooms/[id]/RoomV3.tsx` — native Command Room chat composer/textarea layout. Do not modify for unrelated sidebar, menu, persistence, language, or search work.

## Current exception

`public/rc-question-rules-v2.js` may add question numbering/date/time/search behaviour, but it must not inject a second text-entry field or replace/resize the native RoomV3 textarea.
