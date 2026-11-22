# RCA composer clipboard repair — 2026-11-23

Owner scope: repair Ctrl+V in the existing V3 joint AI preview, for the combined question, each provider card and the opened provider room. V4, live production and conversation history are unchanged. Preview baseline: `86cf63d06e1484bd8de540e0fec4c4773bca9652` (READY before the repair); no production promotion.

The combined composer used to show a selected file but sent text only. Now native text paste remains enabled and PNG/JPEG paste/file selection is staged in its own combined or provider-specific draft. Nothing is sent on paste. Explicit Send or the existing individual Enter action sends up to four images, 2 MiB in total, only to the selected native provider or providers and only for that turn. Images stay out of conversation storage and the final integrator request. Unsupported routes and failures are explicit; images do not fall back through a third-party router. Failed sends retain the draft. Actual configured model acceptance requires live owner verification; tests use synthetic inputs without external sends.

Standard lane: one writer; independent Codex review and mocked connector payload checks. Rollback may redeploy the known preview baseline without a data migration; preview and production domains are separate.
