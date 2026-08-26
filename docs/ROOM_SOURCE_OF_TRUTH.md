# Royal Command Room Source of Truth

Status: current runtime authority.

## UI source

The active Command Room UI is the source-rendered Room implementation under `src/app/rooms/[id]`. Approved locked UI surfaces must not be silently overridden by helper scripts or unrelated execution changes.

## AI routing source

`/api/ai/chat/stream` is the single Room runtime authority for AI routing and executable-development intent.

`/api/ai/chat` is compatibility JSON only and delegates to the stream endpoint.

## Developer execution source

`/api/dev/agent` is the single shared GitHub developer executor for:

- ChatGPT / `openai`
- Claude / `anthropic`
- Gemini / `google`
- Grok / `xai`

Provider-specific compatibility routes must delegate to this executor and must not contain independent GitHub write logic.

## GitHub execution contract

All executable writes require host Work ID, Revision, Provider identity, safe provider-scoped `rc-work` branch, host commit evidence, and PR/Queue controls. Direct `master` writes are prohibited.

Tool Gateway GitHub writes use the same contract.

## Codex

`/api/builder` is an explicit Codex specialist analysis route only. It is not the Room execution authority and has no GitHub writer.
