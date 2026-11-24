# RCA composer clipboard repair — 2026-11-23

Owner scope: repair Ctrl+V in the existing V3 joint AI preview, for the combined question, each provider card and the opened provider room. V4, live production and conversation history are unchanged. Preview baseline: `86cf63d06e1484bd8de540e0fec4c4773bca9652` (READY before the repair); no production promotion.

The combined composer used to show a selected file but sent text only. Now native text paste remains enabled and PNG/JPEG paste/file selection is staged in its own combined or provider-specific draft. Nothing is sent on paste. Explicit Send or the existing individual Enter action sends up to four images, 2 MiB in total, only to the selected native provider or providers and only for that turn. Images stay out of conversation storage and the final integrator request. Unsupported routes and failures are explicit; images do not fall back through a third-party router. Failed sends retain the draft. Actual configured model acceptance requires live owner verification; tests use synthetic inputs without external sends.

Standard lane: one writer; independent Codex review and mocked connector payload checks. Rollback may redeploy the known preview baseline without a data migration; preview and production domains are separate.

### Follow-up: pasted images rejected by the draft limit

The owner verified the updated preview and showed one `image.png` in both the combined and Claude drafts alongside the 2 MB message. The old draft limit rejected the next image if the total size of the unprocessed originals exceeded the request limit. The draft now keeps up to four source images (32 MiB per image, 64 MiB per draft). If needed, the browser reduces images on Send while keeping the existing 2 MiB transport limit and paste order. The UI identifies attached images and exposes the existing individual Send action beside an attachment. No image data leaves the page before Send, and provider/account settings are unchanged.

Follow-up rollback point: preview commit `2a24871e8884d420f61a2667c934c09a5b392ef8`, deployment `dpl_7eS9wGvk9heiPz3qCgfn4bNfR3yL`, verified READY at the existing preview alias before the change. Actual provider acceptance is still unverified.
