# Realtime token 400 fix — 2026-08-23

Production symptom: RC Room mic immediately showed “실시간 음성 연결을 시작하지 못했습니다.” and no usable live transcription session started.

Vercel runtime logs showed OpenAI returning HTTP 400 from `/v1/realtime/client_secrets`:

`Turn detection is not supported for this transcription model.`

Root cause: the transcription client-secret request included `session.audio.input.turn_detection` while using `gpt-live-transcribe`. That model rejected turn detection in the client-secret session payload.

Fix: remove `turn_detection` from the transcription client-secret configuration and rely on transcription events for text updates. The local browser waveform remains independent of the network path and starts as soon as microphone capture succeeds.
