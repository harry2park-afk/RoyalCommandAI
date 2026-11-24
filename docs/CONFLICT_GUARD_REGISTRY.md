# Royal Command Conflict Guard — Ownership Registry

Status: **ENFORCING in CI** (`CONFLICT_GUARD_STRICT=1`). Suspected ownership conflicts fail the check; scanner errors fail closed. It does not modify or auto-fix application code. Local diagnostic warning mode is not merge approval.

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
4. In CI, no findings = exit 0, ownership findings = exit 1, scanner failure = exit 2. Diagnose these separately.
5. Review suspected conflicts against the actual owning component before changing an owner rule. Keep regression coverage; do not silence the guard merely to make a PR green.
6. Large diffs are streamed, preserving the same ownership checks without the former 1 MiB process-output limit.
