# Katie Preview voice conversation

- Risk: STANDARD. Lane: Katie secretary client voice; single writer: Codex.
- Owner authorization: add microphone / hands-free conversation to existing Preview secretary.
- Base: 0d87241c33a5b9cc94c945d4f0fe9a2959bcac53, PR #748 preview branch.
- Boundaries: client microphone control and existing secretary submission. No phone, Retell, webhook, customer-data migration, Production/master, auth or environment changes.
- Independent review: voice_review reviewed races, lifecycle, approvals and echo; two P2 findings fixed (45s request timeout and typed/voice mutual exclusion). Bounded recheck confirmed both fixes.
- Passed: Next production build, TypeScript, new voice component ESLint; 7 Vitest session tests (simulated speech and React hooks, not real audio).
- Tested logic: no mount auto-start, once-only submit, response playback before re-listening, spoken stop, permission-denied stop, late-response suppression on unmount, hidden-page cleanup, bounded silence retries.
- Browser limitation: local Chromium could not launch; managed browser could not open local harness. Existing Preview secretary link leads to login in the managed browser. Real authenticated Preview UI, device microphone/STT accuracy and audible playback remain UNVERIFIED.
- Behavior: user starts voice explicitly; browser speech recognition transcribes and auto-submits each utterance; device TTS speaks the reply, then listens again. Korean default / Australian English input selector. Exact voice stop command: 대화 종료 (or stop conversation). Stops on tab change, page hiding or errors. Existing external-action approvals remain.
- Limitations: browser speech-service availability and network required; device voice is not the Retell telephone voice; no voice interruption while Katie is speaking (visible Stop remains available). This adds conversational voice, not voice operation of every application control.
- No evidence-based claim of full device validation or end-to-end completion until actual microphone testing passes.


## Android microphone correction (supersedes original input implementation)

- Owner reported repeated recognition beeps, very short input and Korean misrecognition after testing the original Preview. Original mock tests did not establish device compatibility.
- Code evidence: original input used SpeechRecognition with continuous=false and automatic onend restarts. Actual OS beeps and recognition language selection could not be inspected remotely.
- Replaced only secretary input with one permission-granted getUserMedia stream, MediaRecorder utterances and the existing authenticated /api/voice/transcribe route. No backend, credentials or phone changes.
- Korean is explicitly sent as language=ko; Australian English as en. SpeechRecognition is no longer used by this component. Silence does not invoke transcription or automatically reopen the microphone.
- Speech end waits for 1.8 seconds of silence, with 30-second no-speech and 60-second capture bounds. Capture is muted during transcription and playback. TTS completes before the same microphone stream is re-enabled.
- Cleanup releases all media tracks, closes the audio context, clears timers, aborts transcription and ignores late permission grants/results. Server transcription is limited to 45 seconds on the client.
- Independent review found one P2 (early audio-context resume rejection); fixed with immediate rejection handling and regression test.
- Tests use simulated media/STT, not device audio. Actual Android microphone capture, Korean accuracy, authenticated server transcription and playback remain UNVERIFIED until device testing. Do not mark this as full end-to-end success.

- Correction validation passed: Next build + TypeScript, ESLint for changed implementation, 12 recorder-session tests including Korean parameter, pause preservation, one-stream reuse, silence, permission failures, late grants and cancellation.


## Composer simplification

- Risk FAST, single writer Codex. User requested icon-only microphone inside a larger chat composer, no separate language picker or standing instruction panel.
- Input is now full conversation width with 160px minimum height and an 80px bottom inset for the microphone/send controls; latest messages scroll into view.
- Microphone reads existing /api/user/preferences language, with saved royalcommand:ui-locale and browser-locale fallback. No preference writes or login changes. Voice service receives the selected primary language tag rather than forcing every non-Korean locale to English.
- Preserved: automatic spoken-question submission, same answer in chat and speech, then listening resumes. Icon retains accessible name, pressed state, screen-reader status and visible errors only on failure.
- New UI does not change the audio engine, Retell, customer history, Production/master, or external-action approvals. Actual authenticated browser/device verification remains pending.

## Microphone failure investigation and diagnostics

- Risk STANDARD; independent voice_review review. User reports active microphone with no transcription. Screenshot confirms browser microphone indicator and misleading slashed microphone icon, not successful audio capture.
- Preview runtime evidence: middleware trace for POST /api/voice/transcribe at 23:31:34; no matching helper request or error log. Middleware HTTP 200 does not establish transcription success. Managed browser redirects to login. Root cause remains UNRESOLVED.
- Corrected active icon to microphone; listening has a green ring whose intensity follows measured input. Other processing phases use amber. No language selector or standing instructions added.
- Added sanitized transcription stage/error diagnostics with random request ID, stable failure codes and timings; never log audio, transcript, credentials or user identifiers. Upstream timeout is 35 seconds, below client 45 seconds. Preserve successful response contract.
- Review P2 fixed: response-body timeout is rethrown and classified as VOICE_TIMEOUT; malformed provider JSON is VOICE_PROVIDER. Regression coverage added.
- Validation: Next build including TypeScript, ESLint, diff check, 20 tests across recorder session and transcription route passed. Tests simulate media/provider behavior; real device microphone, authenticated transcription and audible reply remain UNVERIFIED.
- Scope: Preview only. No Retell, phone, database, environment, authentication or Production/master changes. No claim that the reported microphone failure is resolved until actual runtime evidence establishes it.

## Live text correction (2026-09-17)

- STANDARD; single writer Codex; continuing Owner authorization. Independent voice_review reviewed WebRTC lifecycle; closing-channel send issue fixed with ready-state check, caught failure and regression coverage.
- Confirmed design mismatch: recorder waited until the utterance ended and SecretaryVoice discarded onTranscript updates. It could not display text as speech arrived. Previous adaptive-RMS experiment was rejected and not deployed.
- Connected a new live secretary transport to the existing authenticated /api/voice/realtime-session SDP broker. Existing route/provider configuration remains unchanged. Reference verified: https://developers.openai.com/api/docs/guides/realtime-transcription (gpt-live-transcribe, delta/completed events, server VAD).
- Waits for server configuration acknowledgement before enabling audio; 1.8-second server turn detection; partial deltas immediately update React input; final transcript uses the existing secretary submission once. Device TTS reads that answer, microphone stays muted until playback finishes. One stream, no SpeechRecognition restarts or local RMS endpoint gate.
- Partial input remains after stop/error; typed prefix preserved; no phone, Retell, customer data, Production/master or credential changes.
- Focused simulated WebRTC tests: 9 passed (live partial text, final once, playback/resume, spoken stop, late permission cleanup, cancellation, provider failure, timeouts, closing channel). Changed session/component lint passed; CustomerAISecretary has existing unrelated any at tab handler and existing warnings. Typecheck passed before final lifecycle guard; full build validates final code.
- Actual authenticated Preview WebRTC/provider/device audio and audible playback remain UNVERIFIED. Deployment is not an end-to-end success claim. No further request to wait 60 seconds; this transport should provide deltas while speaking if provider connection succeeds.

## Confirmed 504 investigation and bounded connection correction

- User authorized repair after read-only investigation. STANDARD, one writer Codex, independent voice_review: no material regression found.
- Deployed 7c963a99018c7ad3307d01c096a8edf9053373df runtime evidence at 2026-09-17 00:19:45, 00:20:05 and 00:20:21 UTC: POST /api/voice/realtime-session 504, Vercel Runtime Timeout Error: Task timed out after 30 seconds. Underlying stalled stage not established from old logs.
- Confirmed code defect: upstream request and response-body wait had no deadline, and transient responses caused a second upstream call within the same 30-second invocation. Replaced with one bounded call, cancellation propagation, and separate auth (5s), SDP input (2s), upstream including body (15s) deadlines. Existing authentication, provider/model/session configuration and success SDP contract retained.
- Added voice-path-only middleware entry/exit trace and route stage timing so middleware/auth/input/provider/body failures can be distinguished. Logs contain generated trace, stage, duration, stable code, numeric status only; removed raw upstream error logging. UI maps safe codes to Korean.
- 20 focused route and live-session tests passed; relevant ESLint and diff check passed. Independent review confirmed late completions do not resume the route. Auth/body underlying operations cannot be cancelled by these local races; middleware auth remains unchanged and only instrumented.
- Actual authenticated Preview connection and device transcription remain pending. This is a confirmed timeout-handling/diagnostic correction, not a proven resolution of the underlying delay. No Retell, phone, customer history, credentials, environment or Production/master changes.
