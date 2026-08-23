# RC Room Realtime Voice Incident — 2026-08-23

The first production Realtime WebRTC transcription attempt reached OpenAI but received an upstream HTTP 504 gateway timeout. The raw HTML error body was accidentally surfaced in the Command Room UI.

Immediate remediation:
- never expose upstream HTML/error pages to the customer UI
- retry one transient 502/503/504 Realtime session failure
- return a short customer-safe service message if the retry also fails
- keep the local microphone waveform so the user can still see whether the selected microphone is receiving sound

The microphone device itself was already verified in Windows and Chrome as S10 Bluetooth Hands-Free.
