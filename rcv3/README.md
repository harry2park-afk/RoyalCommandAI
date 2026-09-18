# RCV3 — independent development core

Status: LOCAL FOUNDATION ONLY. No usable customer room, AI connection, microphone,
database adapter, deployment or real-device acceptance is claimed.

Owner-approved name: RCV3. Development is isolated in this directory; existing
Room6, Katie, customer data, telephone and Production/master are unchanged.
No imports from the old execution chain. No new public route or Preview link.

Implemented: immutable appearance settings, fixed button capabilities, blank
background support, transparent buttons, revision conflict detection and
allowlisted copying to an empty draft with a new ID. Run `npm test` here.

These are in-memory core checks, NOT durable storage, authentication or end-to-end
acceptance. A future server adapter must verify identity from its session, enforce
atomic revision compare-and-swap, recheck capability entitlement on execution and
authorise background assets. Never trust client owner IDs. The renderer must keep
chat, recovery and error controls accessible outside editable themes; validate
actual touch sizes and keyboard access at each viewport. Labels are plain text.
The current function lock compares IDs present in the prior design. A persistent
button identity registry must also reject reuse of deleted IDs with a different
capability before customer editing is exposed; no lifetime ID lock is claimed yet.

Customer appearance data cannot contain code. This is not a claim that source
code never needs maintenance: approved runtime releases remain developer-managed.

Next blocking evidence: a development-only provider credential and authenticated
test session, then real text and Korean voice input/output. Existing provider HTTP
400 has not been explained by evidence. Do not reuse its payload as a proven API
contract. Follow with durable storage/isolation, renderer, copy and locale tests.
Only after complete real workflow acceptance may the fixed customer Preview change.

Work declaration: STANDARD; writer /root; writable scope rcv3/ only, independent
review required. No remote deployment or customer mutation. Unit checks cannot
authorise publication. No new dependency or paid service was added.

Independent review found an appearance edit could freeze unrelated input history.
Fixed by shallow-freezing the returned wrapper; the new design remains deeply
frozen. Seven offline checks pass, including the regression. Real workflow
acceptance remains blocked and no customer release has been made.

## 2026-09-18 implementation checkpoint

STANDARD scope: sole writer /root, independent reviewer /root/voice_review.
Only `rcv3/` implementation changed; no deployment or production/data mutation.

- `store.mjs`: **local development SQLite adapter**, transactional revision checks,
  durable room/design/history, separate chat/secretary history, empty same-owner clone.
  Persistent identity records survive button deletion. UUID case is canonicalized;
  independent review found and corrected a case-variant capability reassignment.
- `text-provider.mjs`: independent server-side provider adapter; fixed endpoint,
  bounded deadline, cancellation, sanitized errors, no automatic retries.
- `npm test` in this directory: 11 passing checks. SQLite tests use a real temporary
  database and close/reopen it. Provider tests use injected mock responses only.

Still NOT a finished customer room: no authenticated server routes, cloud storage
adapter, customer renderer/editor, asset ownership checks, entitlements, live AI
response, or real microphone transcription/speech playback verified here.
The local store trusts server-verified owner identity and must never be exposed
as a client-supplied identity API. It is not Vercel-persistent storage.

Infrastructure blocker remains the recorded execution-host network policy for
api.vercel.com. Existing provider keys in Vercel are not proof that this executor
can retrieve/inject them. Do not repeat device login or publish a working claim.
Next integration must use an authorised executor with the existing Development
configuration, add verified session/cloud adapters, then verify the real customer
flow before any customer Preview publication.

## Shared microphone component (not published)
`voice-control.mjs` defines `<rc-voice-control>` for a persistent application shell.
It samples real microphone audio and moves the recent waveform from left to right,
with mint/blue colour, a large microphone control and accessible status messages.
Reduced-motion preference uses a stationary level display. Recording is limited to
60 seconds; permission/setup and transcription each have a 20-second deadline.
Independent review caught setup stalls and stale-session timer cancellation; these
were corrected. Browser interaction and real audio/transcription remain unverified.

The host must supply `element.transcribe(blob,{signal})` through an authenticated
server adapter and consume `transcript` events. No provider key belongs in this
component. Without an adapter, the button is disabled with an explicit unavailable
status. This is press-to-start/press-to-send capture, NOT streaming dictation,
automatic end-of-speech, spoken answers or completed all-screen integration.
Use one app-shell instance to preserve a session across routes; do not mount a new
recorder in every room. Browser microphone permission remains required.

## Button appearance revision
User requested horizontal 30x50 buttons, interpreted as width 50px / height 30px.
Microphone dock/button borders are invisible; keyboard focus outline is retained.
Wave bars are now 1px thick, spaced 8px (previously 2px/4px), with one new sample
at 70ms intervals moving right. `send-control.mjs` uses a full native button hit
area with faint border, the same dimensions, and an injected submit callback.
Both components expose validated `setButtonSize(width,height)` for the future
editor adapter. Editor persistence/integration and actual customer send are NOT
yet verified. Syntax checks passed; no customer deployment occurred.

## Existing RC editor compatibility checkpoint
Read actual `src/components/CustomerRoomDesigner.tsx`: its discovery excludes
microphone/send protected actions, targets `/rooms/:uuid`, and searches document
DOM (not new shadow-root controls). Consequently existing UI is NOT automatically
connected to RCV3. No legacy editor/protected action code changed.

`button-appearance.mjs` reuses the existing RC schema sanitizer from
`src/lib/customer-room-designer.ts` and adds strict appearance-only fields plus
zero-width borders. Both new controls expose `setAppearance(patch)`; native
handlers remain attached while labels/styles change. The TS dependency requires
the app bundler for browser delivery; raw static-module serving is not supported.

Local store now saves appearance with owner checks and atomic revision checks,
clones appearance without conversations, and supports restore with an empty patch.
13 tests passed; disk close/reopen verifies size and label persistence. Not yet
verified: editor UI binding, browser click/drag, production authentication/cloud
persistence, real AI and voice. These are release blockers, not completed features.
