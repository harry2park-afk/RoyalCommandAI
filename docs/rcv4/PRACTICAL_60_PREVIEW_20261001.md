# RC V4 practical curriculum test — 2026-10-01

## Authorized scope and rules

Harry approved the 30-day / 60-lesson practical curriculum (Page page_948dd696bdb48191bd46d5f54de56a1a) and requested uploading it to existing RC V4 for testing. STANDARD; root sole writer, one independent read-only reviewer per AGENTS/Law Article 4. CODEX_AVAILABLE. Continuing approval covers this implementation and existing branch Preview deployment, not Production, new accounts, paid subscriptions, messages or public project publishing.

Current flow: existing V4 landing / created room → existing `/rcv4/learn` → shared LearningRoom with old 100-source/60-group course. Proposed and implemented flow: same URLs, authentication and shared room controls → registered practical test course `ai-tools-60-preview-v1`, 60 lessons `p001`–`p060`, two per day. No new routes, redirects, forms, toolbox installs or account permissions. Original course remains on V3 and all original records remain untouched. No DB migrations.

Recovery source: `1f57557789d83cb515070fdacae8c0594e060071`, READY Preview `dpl_72QyiBNYqRvn271F6gqpZsPmybTd`, verified before changes. This is a source/assets recovery point, not database, credentials, provider or physical-device recovery evidence. Revert this task commit on the same branch if necessary; do not delete new local notes or alter existing database records.

## Implemented test content

- Approved 60 Korean rows plus English teaching content, practical requests, result checks and revision instructions. Prompts are ordinary language: task, context/data, format and checks. Tutor guides one action at a time and waits for learner evidence.
- Fictional source documents, event plans and arithmetic data support immediate practice. Lesson 27 supplies a fictional English recording script and explicitly asks the learner to record it; it does not claim an audio file is supplied. External generators operate in their own apps; RC tutor does not impersonate integrations or execution. Unsupported accounts can use equivalents and must mark unexecuted generation honestly.
- Existing lesson picker, Day select, teacher voice, input, Send, evidence textarea and feedback button reused. Feedback submits a course-scoped chat request, not a legacy grade. No pass marks, exam or certificate controls for this test. Planned final assessment remains unimplemented for this new course.
- Course-aware draft store validates lesson/day and isolates account/course/language resume and reading state. Original default APIs/keys unchanged. Draft/evidence text is browser-local, not cross-device synchronization. The test page does not fetch original assessment state.
- Typed, spoken and translated lesson requests pass the same registered course ID. Existing server authentication, input validation and provider failure behavior retained. `p...` IDs are rejected by legacy assessment schemas, preventing accidental completion writes.
- Learning toolbox registration/inventory updated for reused action semantics. No extra controls installed. 138 control definitions / 19 existing installable tools.

## Verification and limitations

Independent review found no runtime deployment blocker in course isolation, tutor/translation propagation or draft storage. The stale content-route test expectation was corrected; English lesson27 already asks to record the supplied script (also used in tutor objectives).

Automated checks and browser execution are recorded before the source commit. Local build compiles all 137 routes/pages with TypeScript and toolbox checks. LearningRoom retains the same two pre-existing `react-hooks/set-state-in-effect` lint errors; changed hook dependencies are complete and other changed application files have no findings. Existing middleware deprecation warning remains. This is not a claim that repository-wide lint is clean.

Browser fixture uses the actual React classroom and controlled API responses, not real paid providers. It verifies lesson selection, typed requests, feedback, failed-request draft retention, reload/resume, locale propagation and legacy rendering. Live signed-in provider use and microphone/speaker behavior on Harry's device require his test. Existing education payment/30-day server expiry remains outside this task and is not claimed implemented.

Execution evidence: 16 focused Vitest files / 95 tests PASS; actual Chromium classroom fixture PASS at desktop1366 and mobile390 with zero page errors. Typed chat and evidence feedback carry p001 and the practical course ID; failure preserves the question; p060 evidence/resume restores after reload; Japanese content lookup retains the course; returning to English clears translated UI; V3 still renders its original exam. Test route is only a local Vite harness under tests/, not a deployed Next route. No live provider success is inferred from fixtures.

All60 public titles accompany each practical day translation so the lesson picker uses the selected language without unrelated English fallbacks; legacy translation behavior is preserved.
