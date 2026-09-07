# Command Room UI Rules

Purpose: protect approved UI while allowing supported customer preferences.

## Change rules
1. An owner-approved area is **LOCKED** until the Owner explicitly orders a change to that area.
2. Change only required files/components; no unrelated cleanup, refactoring, formatting or redesign.
3. Shared RC Master UI is the source of truth. Country differences use Country Pack, Policy, Configuration or Locale Overlay.
4. Customer choices such as AI selection/order and language/locale remain changeable through supported preference paths.
5. Before Production: inspect the diff, verify Preview, keep Single Writer and record rollback evidence for locked surfaces.

## Protected ownership
| Surface | Owner |
|---|---|
| Conversation controls | `src/app/rooms/[id]/ChatHistorySidebar.tsx` |
| Room shell/composer/scroll | `src/app/rooms/[id]/RoomV3.tsx` |
| Compact AI Dock | `public/rc-compact-ai-dock.js` |
| First Room welcome | `src/app/rooms/[id]/FirstRoomWelcome.tsx` |

The detailed Header/AI Dock contract remains `docs/RC_MASTER_HEADER_AI_DOCK_UI_LOCK_V1.md`. `public/rc-question-rules-v2.js` may add numbering/date/time/search behavior but must not add, replace or resize the native composer.

## UI contract
- Compact controls: 30px unless explicitly changed.
- SAVE: green; DELETE: red; selection: white with blue accent; New Chat/Voice outline: Command Room blue.
- International labels remain English unless localization is being implemented; customer content and custom titles may use any language.
- No unsolicited external AI/browser tab, repeated forced scroll, or helper-script rewrite of title inputs.
- Shared visual values belong in source components/tokens, not new DOM-mutation helpers.
