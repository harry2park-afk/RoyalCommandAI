# RC V3 payment verification and room activation — Preview design

Status: bank matching rule implemented and tested; no bank feed or live card settlement has been connected. No production or customer activation is authorized by this document.

## Separate the three actions

1. Customer may choose a bank and leave RC for the bank's own login. RC never collects the customer's banking password. A customer may optionally schedule recurring transfers **at their bank**; RC does not control that schedule.
2. RC receives proof of **settled funds** from the recipient account's read-only transaction feed or a verified payment processor webhook. A customer's screenshot, receipt, browser return, or statement that they paid is not proof.
3. RC grants access only after matching one payment to one saved, signed order and recording an idempotent entitlement in a database transaction. Renewals need a new verified payment for the relevant billing period; no payment means no renewal.

## Card

Existing RC V3 Checkout creates test-mode Stripe subscriptions and verifies webhook signatures and the actual Stripe session before fulfillment. It is not a live card payment setup. To go live: configure a verified Stripe business account, live products/prices and checkout origin, live signing secret, and isolated live webhook endpoint; review tax/pricing/terms, chargebacks and refund handling. Test live-path integration using Stripe-approved test methods before accepting customer money. Never infer payment from browser redirects or `checkout.session.completed` alone; verify `payment_status` and invoice/subscription status. Handle `invoice.paid`, failed renewal, refunds/disputes and subscription cancellation for ongoing access. Do not mix test and live account IDs, keys or customer identifiers.

## Direct transfer to ROYAL COMMAND PTY LTD

- Recipient BSB 032070, account 914904; customer enters their existing RC number as transfer reference. The BSB/account are recipient details only and grant **no access to transaction data**.
- The recipient bank is **Westpac**. Ask Westpac which supported **read-only business transaction feed or API** can deliver settled credit records for this account to Royal Command's own system, with transaction ID, date, amount/currency, beneficiary account and full payer reference; ask about eligibility, costs, timing, reversals and supported authorisation. Westpac's standard bank feeds connect eligible facilities to supported accounting software and may not grant an independent RC app transaction access. Alternatively assess an accredited Australian CDR data recipient with this account's eligibility and consent. Never store online banking credentials or scrape the login page.
- Create a signed and priced `pending` order before inviting a transfer; freeze customer ID, RC reference, expected AUD cents, billing period and terms version. The present Preview bank panel displays recipient data but does **not** activate bank-paid rooms.
- Ingest provider-verified credits server-side only. The rule in `src/lib/rcv3/bank-reconciliation.ts` requires settled, correct recipient, exact amount, and exactly one matching RC number. Missing/ambiguous reference or amount goes to staff review; no activation on a partial match.
- A transaction can satisfy only one period/order: record `(bank provider, transaction ID)` with a unique constraint and atomically claim it together with order/period settlement. Store immutable audit details and reject duplicates, refunds, reversals and account mismatches. Reconcile missing or duplicated feed events on a schedule. Manual review uses an authorised view of actual received transactions, not an uploaded receipt.
- Only after the claim succeeds invoke the existing room creation procedure with an explicitly verified bank entitlement; keep token and bank cash ledgers separate. If creation fails, retry idempotently without claiming or charging twice. Recheck entitlement on every protected service use and expire it when the paid period ends.

## Activation readiness

The payment methods remain distinct: existing owner test tokens open Preview rooms, Stripe is test-mode, and bank links initiate customer-driven transfers only. Before activating cash payments, obtain a bank feed/API contract and transaction sample and verify the card processor live configuration. Enable reconciliation first on a separate test project, then review production changes and reconcile real settled credits before opening a customer room. Never mark a bank receipt as paid merely because the customer visited a bank website.
