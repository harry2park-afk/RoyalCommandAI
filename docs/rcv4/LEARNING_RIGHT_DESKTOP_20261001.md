# V4 education right panel — 2026-10-01 Australia/Sydney

Risk: FAST, presentation change. Single Writer: Codex. Owner approval covers the existing V4 education right panel, tests and reflection to the existing branch Preview. No Production promotion, new route, customer account change, payment, provider configuration or external message.

## Scope

- V4 desktop right panel fits its viewport. The panel itself does not scroll; long conversation history and expanded voice options retain wheel, touch and keyboard access without visible scrollbar tracks.
- Remove visible chat heading and field label in V4; keep the selected-language accessible textarea label.
- Reuse toolbox `ToolButton` / `send` and the existing `Send` paper-plane icon inside the right edge of the input. Retain the existing text/voice handlers, busy/empty/exam guards, API request, error and draft persistence behavior.
- Avatar height uses an inherited V4 desktop CSS variable. V3 defaults and mobile avatar sizing are preserved. Mobile voice/chat ordering is preserved through the display-contents wrapper.
- Left curriculum, regional content, lesson records, forms, authentication and destinations are unchanged. The document's existing left-side scrolling is retained.

## Evidence

- `npm ci --ignore-scripts --no-audit --no-fund` succeeded.
- Toolbox inventory updated to register the changed control definitions; the checker itself is unchanged. `npm run check:toolbox` passed.
- TypeScript, 15 focused room/draft tests and the production build passed.
- Real Chromium rendered the imported LearningRoom, LearningVoice, LearningAvatar, CSS modules and global CSS in a temporary Vite harness. Local mocked learning/avatar responses avoided customer data, paid AI and external voice requests. Next image optimization was locally fulfilled with the existing poster asset.
- Viewports: 1920×942, 1366×768, 1280×600 and 1024×768. Right-panel overflow is hidden; input/send geometry remains within the viewport and input boundary at every size. Long transcript layout also keeps the input visible.
- Verified typed send → existing chat request → rendered answer → cleared successful draft. Verified 429 → error → preserved draft → enabled retry, and reload preserves the draft. Expanded voice options keep input visible. At 390×844 the avatar remains before the input. V3 retains its original send control and chat heading.
- No browser page errors in this harness. It does not prove live authenticated AI/avatar-provider responses or a physical Galaxy Tab. The agent-browser daemon could not start in this execution environment; direct Playwright/Chromium provided the rendered interaction and geometry evidence instead.
- Scoped ESLint is not clean: LearningRoom has two pre-existing synchronous-effect findings and the test helper has two pre-existing explicit-any findings. No lint rule was disabled. These are not claimed as passed and are outside this right-panel presentation repair.

## Recovery / publication boundary

Source recovery base: `1a2886e05e86d5c9c3ba1b72da49fba892011559`, branch `work/rcv3-provider-balance-20260929`, prior READY Preview deployment `dpl_Ho9hFDuMpX8XCaJ3JpTEAw2Tk9Rt`.

Recheck the remote branch before reflection; do not overwrite concurrent work or force-push. Confirm READY Preview for the new exact commit before announcing publication. This record is local test evidence, not a claim that publication has already succeeded. Source recovery restores tracked source and existing basic assets only; it does not restore customer records, uploaded assets or external provider state. The prior source commit and deployment are retained.

## Follow-up: automatic conversation sizing and moved Stop

Harry approved the right-side follow-up through completion: remove idle avatar/teacher readiness, static lesson title and generic hint; move Stop to the right of the AI speaking text window; size AI text and customer typed/spoken text automatically. FAST scope remains the existing V4 right panel and existing Preview, with no provider, account, payment, left-curriculum or route changes.

Recovery base for this follow-up: `0a741a945e601d622950b13734822ccbfdc06332`, READY Preview `dpl_5Ri8iEGvLyvSo6y7sRNGwVceWmui`. The initial repair and its prior recovery base are preserved.

- The same toolbox LearningVoice Stop/Pause nodes and handlers are moved through a React portal into the answer window. No second speech cancellation implementation is introduced. V3 keeps its original placement and guidance.
- V4 displays the latest assistant explanation, so the answer window grows for a longer explanation and shrinks for a shorter one. Full conversation state, request history, account-scoped resume/drafts and teaching bookmarks remain unchanged.
- Shared `LearningAutoTextarea.tsx` sizes the existing value from measured content, with resize/width observation and cleanup. It never changes or submits customer text. It is documented in the existing learning registry, alongside the existing toolbox controls; the inventory checker is unchanged.
- Answer, dictated transcript and textarea growth are bounded to the viewport. Long content remains scrollable with wheel/touch/keyboard. Avatar sizing adjusts to the remaining desktop area; mobile uses its existing portrait height.
- Only idle/static guidance is suppressed in the V4 compact presentation. Actual voice failures, microphone unavailability and avatar errors still appear.
- 25 focused room/voice/draft tests, typecheck, toolbox gate, changed toolbox-component lint and production build passed. Earlier unrelated room/test lint findings are unchanged and are not claimed as passing.
- Actual Chromium/local-fixture checks verified four desktop viewports, empty-window Stop right alignment, short → long → short typed input, dictated input growth/shrink, latest AI reply growth/shrink, stopped dictation rejecting late results, and moved Stop aborting the existing pending speech request. Stop leaves typing usable. Send success, failed-send draft preservation, reload recovery, settings/input visibility, mobile order and the V3 presentation were checked. The agent-browser daemon remains unavailable; direct Playwright/Chromium supplied the rendering and interaction evidence.
- Representative 1024×768 heights: typed/dictated input 72 → 168.95 → 72 px; latest AI reply window 84.78 → 230.39 → 84.78 px. This is test-fixture evidence, not an authenticated live provider call or proof of a configured real avatar.

## Follow-up: remove V4 voice settings

Harry explicitly requested deletion of the voice-settings entry and prohibited unapproved additions. FAST, single Writer, V4 right panel only, existing branch Preview destination. Recovery base: `7b55a674e6d3fba67b89c7cae92200463df13d7c`; previous READY Preview: `dpl_2pR5e3Zfhi1669MMGJnSSUPDrL3U`. The prior source and deployment remain available.

- The existing optional voice-settings details are no longer rendered in V4 compact mode. No replacement button, route or feature was added. V3 keeps its existing options and handlers. Daily teaching, avatar start, the answer-window Stop and typed send retain their existing handlers. Manual microphone/read/listen-only controls from that optional menu are no longer presented in V4.
- 19 focused voice/room tests, TypeScript, toolbox inventory, LearningVoice ESLint and production build passed. The inventory checker was unchanged.
- Real Chromium with local API fixtures verified that settings are absent before and after reload, avatar lesson start initiates speech, Stop aborts the pending speech request and leaves typing usable, send succeeds, failed-send drafts survive and reload restores them. Input and send fit at 1920×942, 1366×768, 1280×600 and 1024×768; auto sizing remains intact. Mobile order and V3 voice options/presentation remain intact. No page errors. These checks do not prove authenticated live AI or real avatar-provider responses.
- Remote branch must still match the recovery base before reflection. Publication completion requires READY deployment for the exact new source commit; no Production promotion.

## Follow-up: edge-aligned tutor and study-only scrolling

Harry requested moving the right panel to the viewport edge, giving reclaimed space to the study column, moving the scrollbar to the divider for left-only scrolling, and locking the right column vertically. FAST, one Writer, CSS-only V4 desktop presentation, existing branch Preview. Source recovery base: `ba7b8fa75d7aab4fd8b0479b26b942c4a5952d5d`; READY Preview: `dpl_PUkHWkSCTy1pcpgqXXMudFpSTrA4`. Prior recovery points remain available.

- Cause: global desktop `main` styling forces 85vw and centered margins; curriculum height previously drove document scrolling. The scoped V4 desktop CSS overrides that width/margin, fixes this classroom to the viewport, and gives the existing study column its own overflow. No global stylesheet, handler, text, route, account, payment, education data or new control changes.
- At widths at least 1000px, tutor width remains 42.5% of the viewport (the former 85% frame divided in half). The left side receives the reclaimed margins. At 761–999px the existing equal-width split remains. At mobile widths the previous document flow and avatar-before-input order remain.
- A normal browser scrollbar sits at the study column's right edge. Whole-panel tutor movement is locked; bounded internal answer/input scrolling still permits long text to be read and edited.
- Real Chromium rendered the existing components with local API fixtures at 1920×942, 1366×768, 1280×600, 1024×768 and 900×700. Verified viewport-edge alignment, preserved tutor width, divider scrollbar drag, left mouse-wheel movement, accessible last study item, no document overflow, and unchanged right-panel geometry during left and right wheel input. Playwright's default scrollbar-hiding launch flag was disabled in the harness to verify the actual native scrollbar; no custom replacement scrollbar was added.
- At 1920px, left width is 1104px and right width is 816px; the right edge is exactly 1920px. Typed input and latest answer growth/shrink, paper-plane send success, failed-send draft preservation, reload recovery, avatar lesson start and Stop cancelling pending speech were checked. No page errors. V3 still uses its prior centered 85% desktop width, heading and voice options. At 390×844 V4 leaves desktop fixed mode and retains mobile ordering. Live authenticated providers and physical device/browser settings are not proven by fixture checks.
- Production build (including TypeScript and toolbox inventory) passed for this CSS change. Publish only after the remote branch still matches the recovery base; completion requires READY Preview for the exact published source. No Production promotion.

## Follow-up: Start left and Stop right inside tutor

Harry explicitly requested both controls inside the bottom of the tutor window, Start left and Stop right. This supersedes the earlier answer-window Stop placement. FAST, one Writer, existing V4 education presentation and branch Preview only. Source recovery base: `8fe121ba73a978dceca04c4cb08ebd670735faf0`; previous READY Preview: `dpl_A9BsE3KY5BDuBs6UCfBP1CHj4q3o`. Prior points remain available.

- Shared LearningVoice renders the existing daily-start action and existing Stop handler in its own bottom row for V4. V4's old study-column Start and answer-window Stop mount are removed. The unused controlsTarget portal contract/state/styles are removed. Avatar touch behavior and V3 controls remain unchanged. The V4 row contains only Start and Stop; V3 retains its existing conditional pause/resume control.
- Start uses the existing daily plan/bookmark and audio pipeline. It is disabled during teaching, blocked access/request state, an unfinished draft or an unavailable daily plan; Stop remains available to cancel pending speech. Drafts, learning records, authentication, routes, country settings, paid providers and lessons are unchanged. No new voice-setting menu or new service was added.
- Shared learning toolbox description and control inventory were updated (130 registered definitions, 19 tools); the checker itself was not changed.
- 20 focused voice/room tests, TypeScript, toolbox check, LearningVoice lint and production build passed. Real Chromium/local fixtures checked the five desktop sizes from the preceding section, two-button left/right alignment inside the tutor bottom, removal of old placements, Start → pending lesson speech → Stop abort → Start again, disabled Start during speech/unfinished drafts, and recoverable speech failure with visible existing error status.
- Long answer, typed input and transcript simultaneously leave controls and input visible. Typed send success, failed-send draft preservation and reload recovery, auto sizing, left scrollbar dragging/right-column lock, mobile order and original V3 presentation were also checked. No page errors. These tests do not prove live authenticated providers or physical-device behavior.
- Publish only against an unchanged remote recovery base; completion requires exact-source READY Preview, no Production promotion. Source/basic-asset recovery does not restore customer records or external provider state.

## Follow-up: remove reading captions and align tutor above controls

Harry requested removal of the normal reading-status text under the tutor, then clarified that the tutor should extend down toward the existing Start/Stop row within its own window, rather than move into the answer window. FAST, one Writer, existing V4 right panel and branch Preview only. Recovery base: `edd3652aa1e9e6882c30b769d41ce744a2637c4d`; prior READY Preview: `dpl_3yWbL5i6mkoFfv5p6VND7FEivm7X`.

- V4 compact mode omits normal reading/listening/preparing/paused status captions. Actual speech and microphone errors remain visible. V3 captions and all audio/control handlers remain unchanged.
- Removing the caption returns that vertical space to the existing tutor frame. Desktop compact poster/video alignment is bottom-centered, immediately above the existing Start/Stop row. The tutor frame remains separate from the answer window. Mobile image alignment is unchanged. No image, provider or customer-data changes; the existing source portrait contains shoulders only, so this layout repair does not claim to create hands or a waist.
- Ten focused voice tests, unchanged toolbox gate (130 definitions, 19 tools), LearningVoice ESLint, production build including TypeScript, and diff whitespace checks passed.
- Real Chromium with local API/media fixtures verified desktop 1366×768 and mobile 390×844: normal reading captions absent, Start/Stop preserved, speech failure visible, and original V3 reading caption retained. On desktop the tutor stage ends within 12px of Start, bottom alignment is applied, and the answer window does not overlap it. Start enters reading, Stop invokes the existing pause path and re-enables Start. No browser page errors. Fixtures do not prove live authenticated provider output.
- Publish only if the remote branch still matches this recovery base, then confirm READY Preview for the exact source commit. Prior source/deployment recovery points remain available. Source/basic-asset recovery excludes customer records, uploaded designs and external provider state.
