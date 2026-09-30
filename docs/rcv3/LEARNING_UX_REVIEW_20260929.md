# Learning room continuity improvement

STANDARD scope: Harry's 2026-09-29 approval to improve the existing learning room. Single writer, independent read-only reviewer. Preview branch only. Restore tag recovery/learning-ux-20260929.

Reuse: existing learning toolbox screen and server quiz/project completion. Registered account/course/lesson-scoped browser draft utility before consumption. No database, authentication, billing, room creation or exam-answer changes.

Changes: explain completion conditions; show persisted project pass/revise result; offer next lesson only after server-recorded completion, update study day at boundaries, stop at 100; save unsent question and assignment text on this browser under the signed-in account. Quota/corruption failures are visible; one corrupt entry does not prevent other lessons restoring. Chat history is not persisted. Existing submitted work/progress remain server-owned. Drafts are device/browser-only and are not cross-device backup.

Evidence: 26 focused tests passed (including UI handlers with mocked React state, server grading, scope isolation, storage failures and day boundary). Next production build, typecheck, toolbox inventory and whitespace check passed. Independent review found no blocker; saved status gating and per-lesson corruption recovery addressed.

Not verified: authenticated live browser reload, real AI feedback, cross-device behavior. Browser permission was previously denied; no bypass attempted. This patch is isolated from the original live Preview branch until integration.
