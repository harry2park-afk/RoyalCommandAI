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
