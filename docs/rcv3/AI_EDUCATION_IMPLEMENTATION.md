# AI Learning Room — implementation evidence

Date: 2026-09-21. Scope: PR #748 Preview branch only. Risk: HIGH-RISK because account-owned learning records and server-issued certificates. Two independent code/security reviews; no external Codex connector used (CODEX_UNAVAILABLE).

## Implemented

- `/rcv3/learn`, linked from V3 header and existing room catalog menu. Authenticated free access without paid-room requirement.
- 100 numbered bilingual curriculum topics, 30-day selector, 3–4 topics/day, stored completion. History/theory/current/future and increasingly applied work after050; company reports, analysis, code/web/automation and final capstone.
- Shared HelpText/Translate explanations, shared account answer language, existing connector for tutor and written assignment assessment. AI allowance30/day including reviews; no live browsing/code execution by tutor or grader.
- Lessons001–050 knowledge checks;051–100 assignment submission150–6000characters,4x25 rubric,70pass. Submitted artifact/feedback retained by owner. Passed evidence immutable; database trigger atomically records completion.
- Final exam requires100completions:30questions sampled3per10-topicgroup,30min server deadline,70pass,3newattempts/day. Answer keys server-only; repeat submit cannot replace score; active attempt can resume. In-memory answers/drafts survive within-page switching; unsent work is not guaranteed after leaving/reloading.
- Owner-only printable certificate with account name,score,date,UUID and clear non-accredited/unproctored statement. 30days is recommended pacing, not verified attendance. AI-assessed written evidence does not prove authorship or execution.

## Verification before deployment

- TypeScript: pass. Scoped education/locale lint: pass. Existing Room.tsx has unrelated old lint error for `/rooms/rca` anchor and warnings; only education navigation was added there.
- 19 targeted tests: auth,ownership,quota,answer isolation,70boundary,expired exam,advanced quiz bypass rejection,AI grade validation,server certificate issuance.
- Supabase migrations applied:20260921050212,20260921051948,20260921052125. All4learningtablesRLS enabled; authenticated browser INSERT denied. Service role used only after authenticated Preview session; owner/course filtered.
- Transactional database verification: failed project does not complete;70project atomically completes; later failed overwrite preserves passed evidence; certificate70accepted and nullscore denied. Test fixtures rolled back.
- Reviews caught and resolved repeated distractors,DB70constraint mismatch,project evidence overwrite,atomic completion,exam clock drift,resume answers and unsent assignment navigation retention. All100questions now have topic-specific bilingual distractors and varied answer positions.

## Deployment verification

Application commit `3de1a698a0d24e245a3e115a3535e4f2afe0b587`; Vercel deployment `dpl_6MQgQa1CgQzpbC4Y8qwmkeHdBANt` READY, Preview alias assigned. Production/master unchanged.

Authenticated browser verified: 100-topic/30day display, selected-day lesson navigation including098–100, explanation Translate to Korean and English return, live Korean tutor answer, wrong-answer rejection and correct-answer saved completion, locked final exam before100completions. Lesson061 fictional company report scored90/100 with Korean AI feedback; completion and report/feedback persisted in a new browser tab. Unsubmitted report survived switching061→062→061. Passing submission control disabled. Test-created001/061completion and fictional report removed afterward; no real certificate issued.

The final exam/certificate engine is verified by route tests and transactional database checks; no claim that a real student completed100lessons or that a live learner certificate was earned. Curriculum instructional depth is AI-guided and remains subject to educational review. Print control uses the browser print dialog.

## Broader platform limits

See [approved rules](PLATFORM_AND_AI_EDUCATION_RULES.md) and [self-service tool design](SELF_SERVICE_TOOL_ROOM_DESIGN.md). Owner-permitted room visits, full RC native chat, alltoolpaidactivation lifecycle and real meeting translation transport are separate work. This education addition does not claim those goals complete.
