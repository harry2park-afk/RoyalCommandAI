# RC V3 provider selection and Preview token controls

Scope approved by Harry on 2026-09-29: compact AI selections/search and use existing balances without unnecessary transfers.
Risk: STANDARD UI integration; no ledger, API, authorization, migration, customer data or Production change.
Lane: work/rcv3-provider-balance-20260929. Writer: main Codex. One independent read-only reviewer.
Base/rollback: cf481f71228806e27acf1ac960eb47588a624553, local restore/rcv3-provider-balance-20260929.

## Reuse and changes
- AI List toolbox control: ProviderChoices.tsx, version 1. Uses existing provider registry IDs, existing logos and parent providerToggle/draft autosave; no connection/entitlement granted by a checkbox.
- Default: ChatGPT, Gemini, Claude, Grok, DeepSeek, Perplexity. Search all supplied registry names. Previously selected additional providers remain visible on collapse.
- Remove boxed choice styling within Create Room, preserve draft inputs and data paths.
- Existing create-room token control keeps direct /api/rcv3/token-room path independent of bank quotes. Explain missing consent/name/settings, insufficient tokens and unconnected AI; preserve explicit debit consent.
- Bank action is explicitly pending-payment creation and no longer subsequently deducts tokens automatically.

## Evidence
- npm run typecheck passed.
- 37 tests passed: customer-ai, room-draft, checkout-ledger, checkout quote route.
- Toolbox inventory refreshed and diff whitespace check passed.
- Independent read-only review found no blocking UI regression.
- No live room creation or payment performed; live UI/action verification remains pending.

## Not implemented / material limits
- Current token ledger and SQL RPC are restricted to Harry's RC 0357060 Preview account; not general customer tokens.
- No RC cash wallet ledger or verified cash deduction/activation implementation was found.
- Existing backend rejects unconnected selected AI and custom feature requests pending review. UI work does not remove these checks.
- Complete general balance fulfillment requires an isolated wallet implementation with authoritative pricing, atomic debit/create, idempotency and insufficient-balance entitlement tests. This patch does not claim that work complete.
