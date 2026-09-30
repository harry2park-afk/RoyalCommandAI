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
