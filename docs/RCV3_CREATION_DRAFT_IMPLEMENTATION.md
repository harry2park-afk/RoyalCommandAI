# RCV3 room-creation draft workspace

2026-09-19. Risk: STANDARD for isolated draft-only flow; payment activation remains HIGH-RISK and unfinished. Single writer: Codex. Independent read-only reviewer: review_creation_drafts. Continuing Owner authorization covers this implementation. No Production change; existing `/rcv3` handlers, room controls, authentication, provider connections and pricing policies are unchanged.

## Implemented

- Separate authenticated Preview route `/rcv3/create`.
- Four compact stages: Room Setup, AI & Tools, Design, Review.
- Reuses all 40 existing purpose IDs and their field modules. Removes headcount, atmosphere and customer-type questions. Multi-select options and purpose-specific tasks.
- Reuses six existing room artworks. Choosing a different image changes the draft only.
- Room name, requested services, free/paid preference and latest step are persisted as account drafts.
- 1.2-second debounced saves, explicit Save Draft, reload/resume via My Drafts, and New Draft.
- Concurrent versions conflict instead of silently overwriting another tab. A failed save keeps the current edits; Save as New Draft preserves both versions.
- Existing Storage authenticated-owner RLS reused; no new database schema or broad permissions. Registry is insert-only with byte-size bound, max 100 drafts. Drafts cannot grant payment or service entitlements.
- Required messages use shared locale keys: English-only by default, English/Korean for selected Korean. Other languages currently fall back to English.

## Not implemented / not ready to activate

- Live itemised quotation, terms presentation, e-signature capture, Checkout, recurring billing, verified webhook, free/paid room activation and upgrades.
- AI Helper voice/conversation, recommendation engine and actual automatic service provisioning.
- Renaming/deleting activated rooms with transactional last-room protection.
- Main Create Room entry is deliberately not redirected to this incomplete activation flow.

The new commerce module is a **tested decision contract only**, not an integrated payment or authorization gate. It must receive trusted server ledger evidence. Never use it with client-supplied payment booleans. All actual payment work still requires signed webhook verification, idempotent transactions, entitlement enforcement across chat/providers/state routes, paid-quote/draft/terms binding, subscription failure/cancellation policy, and end-to-end test-mode verification before enabling.

## Verified blockers

- Stripe app returned `UNAUTHORIZED / oauth_token_invalid_grant / Reauthentication required`; account/products/prices cannot be inspected through that connection.
- No Stripe keys were found by name in local env files (values were not displayed). This is not a claim about all remote deployment secrets.
- Current old catalog has conflicting USD base rent and AUD add-ons. Owner-approved current Stripe price IDs, billing currency, usage limits, tax treatment and final customer agreement were not established.
- Legacy global commercial-delivery policy conflicts with automated monetary display. Do not broadly delete it: implement a reviewed, narrow approved-catalog exception when commercial inputs exist.

Do not label this a completed paid-room flow. No money was charged, no signature was collected, and no paid service was activated.
