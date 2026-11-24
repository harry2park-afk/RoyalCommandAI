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

## Stripe sandbox continuation — 2026-09-19

Risk HIGH-RISK for payment boundary preparation. Writer Codex; read-only reviews
`review_payment_architecture` and `review_checkout_correctness`. Continuing Owner
approval covers Preview implementation. No live operation, customer charge, or
Production/master change. CODEX_AVAILABLE (host writer/security review).

### Verified account and catalogue

Stripe OAuth reconnection succeeded. MCP read confirmed sandbox
`acct_1UB2UwA6h5Xn5AQj`, one active product `Personal Legal Room`
(`prod_VBPzCzvmbkpRKw`), price `price_1UB39nA6h5Xn5AQj6DjheRMF`,
AUD 10/month, tax_behavior unspecified. This is an observation, NOT approval to
sell every room or provision selected services for this amount. No new Stripe
products, prices, sessions, subscriptions or charges were created.

### Added code

- Pinned Stripe SDK 22.6.2 (verified npm registry).
- `stripe-checkout.ts`: Preview/test-key-only adapter; exact approved purpose and
  service-bundle mapping; server Stripe account/price/currency/interval/tax check;
  immutable order input binds draft hash, terms hash/version and typed signature;
  stored-order idempotency key; server verification of payment, line items and
  subscription; raw-body webhook signature verification rejects live events.
- `POST /api/rcv3/checkout/quote`: authenticated, read-only quote from saved account
  draft. No client price/owner/amount accepted. Always `checkoutEnabled:false`.
- Saved drafts now have resumable `?draft=UUID` URLs and restore directly after
  reload/return. A URL from another owner cannot restore their draft.

The adapter's session creation and webhook helpers are NOT exposed as mutation
routes. This avoids accepting a payment before reliable fulfillment exists.
The quote API is not a completed checkout or paid activation system.

### Required application configuration

MCP OAuth cannot be reused as the deployed application's API credential. No
Stripe variable was present in inspected local runtime/env names. Vercel project
metadata tool does not expose environment-variable inventory; remote presence
must be established by the actual quote request or authorized environment tools.

- `RCV3_STRIPE_TEST_KEY`: a restricted TEST key for the RC sandbox, stored as a
  Vercel Preview sensitive variable, scoped to PR748 branch. Read Account/Prices,
  read/write Checkout Sessions, read Subscriptions. Never paste into chat or git.
- `RCV3_CHECKOUT_CATALOG`: owner-approved exact bundle→price mappings, terms
  version/text and included-tax treatment. Schema exported as checkoutCatalogSchema.
  No default catalogue is fabricated from old mixed-currency constants.
- Future webhook route needs a separate Preview signing secret and a server-owned
  immutable order/event ledger inaccessible to customer writes; both pending.
- All paid execution paths require entitlement enforcement and transactional
  activation before exposing Checkout. Existing private Preview rooms are unchanged.

The initial adapter supports approved AUD monthly, tax-inclusive bundles only.
It refuses the observed unspecified-tax price until actual tax treatment and
catalogue are approved. Automatic tax is not enabled; no tax registrations assumed.
A narrow RCV3 approved-catalog exception is authorized by the Owner's automated
room-purchase instruction; unrelated commercial-delivery rules remain unchanged.

Still not complete: server ledger, event ingestion/replay handling, signature
submission UI, Checkout launch/return UI, paid/free activation and My Rooms
rename/delete protection, conversational Helper. These must not be reported done.

Validation: 28 focused tests passed; full Next build passed. Independent reviewers
both allowed the read-only quote/resume scope. Their duplicate-price finding was
fixed by exact sorted line-item tuple comparison with a regression test. Typed
Stripe account retrieval uses retrieve(null), verified in installed SDK source.
`GET /api/rcv3/checkout/quote` is an authenticated read-only configuration check;
no secret values or environment inventory are returned.
