# RC V3 paid-room creation — Preview implementation

## Work declaration
HIGH-RISK: payment/tenant isolation. Root single writer. Continuing Owner authorization covers Create Room form, monthly consent and payment-confirmed creation on the existing Preview branch. Two independent read-only reviewers (payment correctness and tenant/copy security) reviewed implementation. CODEX_AVAILABLE. No Production promotion, live charge, real price creation, phone reassignment or outgoing message.

## Implemented
- Gallery selections lead to Create Room with selected catalogue design. Direct legacy room POST returns 402 and the form URL.
- Purpose-dependent form retains account-owned drafts. Fresh form includes basic AI selection; customer selects optional services and own secretary contacts.
- Server quote binds draft hash, exact catalogue lines, account, terms hash and version. Monthly total, full configured terms, recurring consent and typed name precede hosted sandbox checkout.
- Server-only immutable order snapshot precedes Stripe creation. Unique owner+draft, session, subscription and room mappings. Same saved request/idempotency key recovers lost responses. Expired/changed orders offer Save as New Draft; existing payment can be checked without another charge.
- Return query is not payment evidence. Authenticated status looks up the signed-in owner's stored order; signed webhook maps to stored order. Both independently verify Stripe and initialize deterministic room/state insert-only. Partial storage failure can retry without duplicating a room.
- Current subscription items/customer/metadata, active status, current item period and latest paid invoice are verified for new-room access. Old paid Checkout alone does not extend service; stale webhook snapshots never update entitlement.
- New state uses only this customer's immutable form and catalogue image; fresh button IDs, no previous room data, assets, contacts, account links or history. Email/phone form values are configuration requests, not verified external connections.
- Shared Preview helper/orchestrator and voice guard paid-room owner/provider permissions. Explicit existing RCA alias is preserved only for protected legacy accounts. Production behavior and Retell telephone ingestion are unchanged. Historical calls remain readable under existing ownership/member checks.

## Database evidence
Applied additive migration `20260919230804_rcv3_preview_checkout_orders.sql` to configured project. No existing room rows/policies changed. Verified both tables have RLS and no anon/authenticated privileges; service-role reads permitted. One-time protected snapshot preserves 12 existing V3 rooms, all one validated existing owner. Existing room metadata cannot grant this exemption.

## Verification
- 114 focused automated tests passed (18 files): checkout identity/price/renewal verification, unpaid no writes, concurrent fulfillment, partial-write recovery, foreign-owner rejection, legacy RCA alias, customer-safe state, draft/quote boundaries, voice recovery/routes.
- Next.js optimized build passed before final UI-only default/error-label adjustments; final build/deployment recorded in task execution.
- Independent review found legacy alias regression and missing requested-room ownership check; both fixed with regression tests.

## Required before activation
Checkout remains fail-closed. No approved full monthly catalogue/terms or deployable sandbox key was available in this task; no real/sandbox payment was made. Required sensitive runtime settings: RCV3_STRIPE_TEST_KEY, RCV3_STRIPE_WEBHOOK_SECRET, RCV3_CHECKOUT_CATALOG, RCV3_CHECKOUT_ORIGIN (trusted stable HTTPS Preview origin). Only enable RCV3_CHECKOUT_ENABLED after signed webhook setup and end-to-end sandbox verification of all services offered.

Catalogue contains approved per-purpose exact service bundles, AUD monthly inclusive-tax Stripe prices, account ID and complete versioned terms. No amounts or legal terms were invented. Specialist AI activation is explicitly blocked because no specialized service provisioner is implemented. Customer email requires their own OAuth; telephone requires verified customer-specific provisioning. These are not completed by typing contacts, and must be verified before offering the corresponding paid package. Existing Harry Gmail remains dependent on his revoked Google consent being reauthorized; telephone settings untouched.

## Rollback
Pre-change Preview source d04ef89954167b1a9b57044eb1983331bc4f308d / deployment dpl_GE9DL5eDYW4AYkwQvdbxwZ7yZQpS. Roll back application code if needed; keep additive ledger/snapshots and any order records. Do not delete customer payment evidence or existing rooms. No Production rollback required because no Production deployment occurred.
