# Professional Room Billing & Entitlement Contract v1.0

Date: 2026-09-02 Australia/Sydney
Risk: HIGH-RISK / COMMERCIAL / PAYMENT
Status: DESIGN GATE — implementation must conform

## 1. Revenue model

Every paid Professional Room may charge three independent revenue layers:

1. **Room Base Charge** — owner-approved published recurring price, configurable per catalog Room.
2. **AI Usage Charge** — metered charge based on the AI/provider/model actually used, using provider/model usage evidence and an owner-approved customer rate schedule.
3. **Royal Command Management Fee** — a separate recurring or usage-linked management/orchestration fee.

Optional Specialty Packs and verified third-party connectors may add separate charges.

No hard-coded universal Professional Room price is permitted. Each Room may have a different base charge.

## 2. Published price vs custom quotation

The existing owner-only commercial quotation firewall remains valid for negotiated/custom pricing.

To support automated paid Rooms, a new distinction is mandatory:

- `PUBLISHED_CATALOG_PRICE`: a price schedule explicitly approved by the Owner for automatic system display and checkout.
- `CUSTOM_QUOTE`: customer-specific negotiated pricing; remains Owner-only and must not be generated/released by AI.

An AI may never invent, estimate or modify a monetary rate. The system may only display a currently active Owner-approved published price record.

## 3. Payment-before-use invariant

Paid Professional Room access follows:

`PRICE_APPROVED -> CHECKOUT -> PAYMENT_CLEARED -> ENTITLEMENT_ACTIVE -> BILLABLE_USE_ALLOWED`

A paid Room or paid AI capability must never become usable solely because an order record exists.

`pending`, `required`, `processing`, `failed`, `past_due`, `disputed`, `refunded`, `chargeback` are not equivalent to `CLEARED`.

## 4. Entitlement state machine

Canonical states:

- `PENDING_PAYMENT`
- `ACTIVE`
- `PAYMENT_WARNING`
- `SUSPENDED_NONPAYMENT`
- `SUSPENDED_RISK`
- `CANCELLED`

### Initial purchase

Before first cleared payment: `PENDING_PAYMENT`. Paid AI/tool execution is denied.

### Recurring payment

At the configured payment due time, if payment is not cleared:

1. immediately enter `PAYMENT_WARNING`;
2. show a clear payment-required warning;
3. set `suspend_at = due_at + 60 seconds`;
4. if still not cleared at `suspend_at`, atomically enter `SUSPENDED_NONPAYMENT`.

The 60-second rule applies after the configured hard payment due time, not after invoice creation.

### Automatic recovery

When a valid payment-provider event proves the outstanding obligation is `CLEARED`:

`SUSPENDED_NONPAYMENT -> ACTIVE`

Recovery must be automatic, idempotent and evidence-producing. The customer must not require manual support to clear an ordinary non-payment suspension.

## 5. What suspension blocks

`SUSPENDED_NONPAYMENT` must block:

- AI model execution;
- paid connector execution;
- external side effects;
- new billable jobs/tasks;
- background billable automation.

It must not block:

- sign-in/authentication needed to pay;
- billing/payment screen;
- viewing invoices/payment status;
- lawful customer data export/exit functions where required;
- security/recovery functions.

Suspension must never delete Room history, customer data, Legal Vault, Accounting Vault or evidence records.

## 6. AI usage charging

Every billable AI execution must carry immutable billing metadata sufficient to determine:

- tenant/org/customer billing reference;
- Room catalog/product ID;
- provider ID;
- model ID;
- usage unit type;
- input/output/other metered units where supplied by provider;
- provider cost reference where contractually available;
- owner-approved customer rate schedule version;
- Royal Command management fee schedule version;
- timestamp;
- execution/evidence ID;
- idempotency key.

The Billing Engine must not read Legal/Accounting vault payload bodies to calculate charges.

## 7. Room pricing schedule

Each Professional Room catalog entry must resolve to a versioned price schedule with:

- `catalog_id`;
- base recurring amount/currency;
- billing interval;
- AI rate-plan ID;
- RC management-fee plan ID;
- Specialty Pack pricing references;
- effective-from/effective-to;
- Owner approval evidence;
- active/inactive state.

A missing, expired or unapproved price schedule is fail-closed: checkout and paid activation are denied.

## 8. Management fee

RC Management Fee must be a separate billing line and never hidden inside third-party provider cost.

Supported models may include:

- fixed recurring fee;
- fixed fee per billable execution;
- percentage markup on eligible metered AI/provider usage;
- hybrid fixed + usage fee.

The actual customer-facing rate must come only from an Owner-approved rate schedule.

## 9. Provider-neutral payment adapter

The payment architecture must not be locked to one vendor.

Canonical adapter requirements:

- create checkout/payment intent;
- create/manage recurring subscription where supported;
- verify signed webhook/event authenticity;
- normalize provider event to canonical payment states;
- retrieve payment/subscription status for reconciliation;
- idempotency keys on creation and event handling;
- refund/cancel/dispute/chargeback representation;
- provider customer/subscription/payment reference storage;
- no card/PAN/CVV storage in Royal Command application data.

## 10. Webhook/evidence authority

Client/browser success screens are not payment evidence.

Entitlement activation/recovery requires server-side verified provider evidence or an equivalent independently verified reconciliation result.

Every payment transition records:

- provider;
- provider event ID;
- event type;
- signature verification result;
- received time;
- effective payment status;
- invoice/order/subscription reference;
- amount/currency expected and received;
- entitlement transition before/after;
- idempotency/replay result.

Duplicate webhook delivery must not double-charge, double-activate or create duplicate ledger entries.

## 11. Race-condition protection

Payment and suspension decisions must be atomic against the latest verified payment state.

Before executing a suspension at `suspend_at`, the gate must re-read/reconcile the canonical payment status. A payment cleared just before the deadline must not be suspended because of stale cache.

Caches may display status but are not authority for entitlement decisions.

## 12. Special risk states

Ordinary payment recovery automatically clears only `SUSPENDED_NONPAYMENT`.

Fraud/security/legal/chargeback blocks use `SUSPENDED_RISK` and require the applicable risk policy; payment alone must not silently override them.

## 13. Alerts

At minimum:

- customer warning at `due_at`;
- 60-second countdown/status visible while in `PAYMENT_WARNING`;
- suspension notice at `suspend_at`;
- payment-cleared / access-restored notice after automatic recovery;
- internal evidence/log event for each transition.

Notification delivery failure must not alter the authoritative billing state.

## 14. Security controls

- server-side entitlement gate before every billable AI/tool/side-effect execution;
- never trust UI state alone;
- signed provider webhook verification;
- secrets only server-side;
- least-privilege payment provider credentials;
- separate Production/Test keys and webhook endpoints;
- append-only or tamper-evident billing transition audit where practical;
- reconciliation job to detect missed webhooks;
- no Vault payload access by Billing Engine;
- no automatic Production pricing change without Owner-approved versioned schedule.

## 15. Current repository gap

Current repository code can mark service selections `pending_payment` and create order rows, but explicitly reports `checkoutConfigured: false`. Therefore actual money collection is not complete yet.

The existing `COMMERCIAL_APPROVAL_POLICY` also prohibits automated display of any customer monetary amount. This must be narrowed so that only Owner-approved `PUBLISHED_CATALOG_PRICE` schedules may be automatically displayed, while custom quotations remain Owner-only.

## 16. Implementation order

1. Fix published-price/custom-quote governance distinction.
2. Implement Room pricing + AI rate + RC management-fee plan contracts.
3. Implement canonical payment and entitlement state machine.
4. Put server-side entitlement gate in front of billable AI/tool execution.
5. Implement payment-provider adapter and signed webhook normalization.
6. Implement 60-second warning/suspension scheduler with stale-state recheck.
7. Implement automatic payment-clear recovery.
8. Add reconciliation/idempotency/audit tests.
9. Only then expose paid Professional Rooms to customers.

Production activation remains blocked until a real payment provider, sandbox E2E, webhook verification, cancellation/refund/dispute behavior and exact-head security/CI evidence pass.
