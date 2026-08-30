# Room Guide voice startup — Codex execution order

Issue: #526
Baseline master: `1fbee0720a1653d50d0717c4329c57b6ea47e3bc`
Work branch: `fix/room-guide-voice-startup-ready-gate`
Restore branch: `restore/2026-08-30-pre-room-guide-voice-startup`

## Role
Codex is the sole writer. All other AI roles are review-only.

## Goal
Fix the Room Builder / Room Guide voice startup state so the UI does not claim that it is listening before OpenAI Realtime is actually ready. Prevent pre-ready audio from being sent as if the transcription session were active.

## Primary file
`src/app/room-builder/RoomBuilderAIFormAssistant.tsx`

Do not modify any other file unless measured evidence proves that this is necessary. `/api/voice/realtime-token` currently returns HTTP 200 in Production and must not be changed without evidence.

## Required implementation
1. Keep the existing microphone permission request and WebRTC/Reatime flow.
2. After `getUserMedia` succeeds, mark the microphone session as connecting, not listening/ready.
3. Obtain the audio track and gate it before the Realtime DataChannel is open (`track.enabled = false` is acceptable if verified in the browser).
4. Do not start the live waveform or set `listening=true` before the DataChannel `open` event.
5. While connecting, show a truthful status such as `실시간 음성 연결 중…`.
6. In the DataChannel `open` handler, if the session is still active and not closing:
   - enable the audio track,
   - set `listening=true`,
   - start the waveform,
   - show `말씀하세요…`.
7. Keep transcription delta/completed handling unchanged unless required for the readiness gate.
8. Keep stop/restart and cleanup idempotent. A user must be able to stop while the connection is still being prepared.

## Locked / non-goal surfaces
Do not change:
- Room Guide layout
- typed text input
- Send
- attachment
- speaker
- form auto-fill / `applyRequest`
- other Room behavior
- auth / billing / provider APIs / database
- RCA routing
- Vercel settings
- Production directly

## Acceptance tests
- Mic click initially shows connecting, not listening.
- `말씀하세요…` only appears after DataChannel open.
- Saying `안녕하세요` immediately after `말씀하세요…` transcribes promptly.
- English first phrase also transcribes promptly.
- Mic stop during connecting is safe.
- Mic stop/restart after ready works.
- typed text, Send, form auto-fill, speaker, attachment remain unchanged.
- no console errors.
- GitHub Change Control, Conflict Guard and Quality Gate pass.
- Vercel Preview reaches READY.

## Release rule
Do not merge to master or Production until the Preview passes and a manual voice test is completed. Evidence-free SUCCESS is prohibited.
