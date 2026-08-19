# Royal Command Conflict Guard v1 — Ownership Registry

Status: **WARNING ONLY**

Conflict Guard v1 observes pull requests and reports likely ownership conflicts. It does **not** modify runtime code, auto-fix code, or block merges.

## Ownership rules

| Surface | Primary owner(s) | Other code should not directly control |
|---|---|---|
| Language picker | `public/rc-language-picker.js`, `public/rc-language-dock-fix.js` | `.rc-lang-picker`, language picker DOM placement, language menu DOM |
| Compact AI dock | `public/rc-compact-ai-dock.js`, `src/app/rooms/[id]/RoomV3.tsx` | compact dock visibility/order, AI slot/selection state |
| Right work sidebar | `src/app/rooms/[id]/RightWorkSidebar.tsx` | right-panel order and `rightPanelApps` persistence |
| Conversation controls | `src/app/rooms/[id]/ChatHistorySidebar.tsx`, `public/rc-sidebar-actions-compact.js` | SAVE/DELETE/select conversation behavior |
| Chat message scroll | `src/app/rooms/[id]/RoomV3.tsx`, `public/rc-chat-scroll-unlock.js` | message viewport scrolling/scroll forcing |
| User UI preferences | `src/app/api/user/preferences/route.ts` | account-backed preference schema and merge semantics |

## v1 rules

1. A PR may touch an owner file when that surface is the stated task.
2. If a non-owner file adds code that directly manipulates another surface, Conflict Guard emits a GitHub Actions warning.
3. Adding a new `MutationObserver`, `appendChild`, `insertBefore`, or forced `scrollTo` in Command Room helper code emits a review warning because these operations can create hidden cross-module ownership.
4. Warnings are advisory in v1. **Exit status remains success.**
5. A warning becomes a blocking rule only after repeated real-world confirmation and explicit owner approval.

## Promotion rule

A warning rule may move to blocking mode only when:

- it has caught at least two genuine conflicts,
- false positives have been reviewed,
- an automated regression test exists for the protected behavior, and
- the owner explicitly approves the promotion.
