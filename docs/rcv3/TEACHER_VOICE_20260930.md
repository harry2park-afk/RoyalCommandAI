# Existing classroom teacher controls — 2026-09-30

STANDARD; Writer Codex; independent reviewer review_rcv3. Harry explicitly requested a visible speaking teacher in the existing classroom on laptop and phone. Scope: existing shared LearningRoom and toolbox voice, no route/form/entry changes. Preview only. Recovery: recovery/teacher-voice-20260930-1455 at 6437a5e6. Restore code only, preserve records.

Reuses existing Katie portrait, shared dictation, AnswerSpeaker, authenticated tutor and speech APIs. Teacher stays above the lesson; top and Day Start controls use the same session. Touch pauses/cancels pending output; resume replays last explanation without another chat request. Spoken wait/resume acts while listening. Quiet listening retries; permission/network errors stop. Hidden page/device change ends conversation. Recent eight messages and lesson position persist under owner/course/language browser storage; source IDs and server completion unchanged. Local edited drafts take priority over server assignment text.

Evidence: 25 focused Vitest tests and three dictation tests pass; typecheck passes; independent review passed after typed-history and assignment restoration fixes. Toolbox inventory 125 controls, 19 tools. Build and deployment evidence recorded in task response.

Limits: no permitted signed-in browser test or physical mobile/laptop audio test. Still turn-taking; cannot hear spoken interruption during playback. Lock-screen conversation unsupported. Portrait is not lip-synced video. Resume storage is browser-local, not cross-device. Existing speech provider configuration/network and daily quota are required, and replay still consumes speech quota. No new billing or entitlement logic.
