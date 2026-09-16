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
