# Royal Command Conflict Guard — Ownership Registry

Status: **WARNING ONLY**. It reports likely ownership conflicts; it does not modify code, auto-fix or block merges.

| Surface | Owner(s) | Protected behavior |
|---|---|---|
| Language picker | `public/rc-language-picker.js`, `public/rc-language-dock-fix.js` | picker placement/menu DOM |
| Compact AI Dock | `public/rc-compact-ai-dock.js`, `src/app/rooms/[id]/RoomV3.tsx` | visibility/order/selection |
| Right work sidebar | `src/app/rooms/[id]/RightWorkSidebar.tsx` | panel order/preferences |
| Conversation controls | `src/app/rooms/[id]/ChatHistorySidebar.tsx`, `public/rc-sidebar-actions-compact.js` | SAVE/DELETE/selection |
| Chat scroll | `src/app/rooms/[id]/RoomV3.tsx`, `public/rc-chat-scroll-unlock.js` | viewport scrolling |
| User preferences | `src/app/api/user/preferences/route.ts` | schema/merge semantics |

## Rules
1. Owner files may change when their surface is explicitly in scope.
2. Non-owner manipulation of another surface triggers a warning.
3. New Command Room `MutationObserver`, `appendChild`, `insertBefore` or forced `scrollTo` triggers review.
4. Warnings remain non-blocking (`success` exit).
5. A rule becomes blocking only after two confirmed conflicts, false-positive review, an automated regression test and explicit owner approval.
