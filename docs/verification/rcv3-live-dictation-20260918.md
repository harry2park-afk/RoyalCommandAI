# RCV3 live dictation

STANDARD; single writer: root; independent reviewer: voice_review. Preview-only, continuing owner authorization. Existing phone/Retell/secretary implementation unchanged. Baseline 1732858833e8fddcf0ee60fdc46aa30affbb03eb.

Cause: MediaRecorder transcription ran only after stop; Room dispatched the resulting text directly to send(message,true).

Change: RCV3 microphone uses continuous SpeechRecognition with interimResults and account language. Partial text updates the editable draft, never chat. Stopping, typing, sending, hiding, or unmounting prevents stale events overwriting the draft. No automatic recognition restart loop. Existing non-RCV3 recorder mode retained. Native recognition availability/network failure is explicitly reported, with draft preserved. Browser service support remains an external dependency.

Checks: production build/typecheck passed; three controller tests cover interim replacement, multiple sentences, stale results after stop/cancel, and network failure; ten existing RCV3 tests passed. Real physical microphone and browser speech service cannot be certified from the cloud browser without audio input. Do not label simulated events as real speech success.
