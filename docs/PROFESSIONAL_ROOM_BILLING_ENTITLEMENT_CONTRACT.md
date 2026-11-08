# Professional Room Billing & Entitlement Contract v1.0

Date: 2026-09-02 Australia/Sydney
Risk: HIGH-RISK / COMMERCIAL / PAYMENT
Status: DESIGN GATE — implementation must conform

## Revenue model

Every paid Professional Room may charge three independent revenue layers:
1. Room Base Charge — owner-approved published recurring price, configurable per Room.
2. AI Usage Charge — metered by the provider/model actually used under an owner-approved customer rate schedule.
3. Royal Command Management Fee — a separate recurring or usage-linked management/orchestration fee.

Specialty Packs and verified connectors may add separate charges. No universal Professional Room price is hard-coded; each Room may have a different base charge.

## Published price vs custom quotation

`PUBLISHED_CATALOG_PRICE` is an Owner-approved schedule that the system may display and charge automatically.
`CUSTOM_QUOTE` remains Owner-only. AI may never invent, estimate, alter or release customer-specific monetary terms.

## Payment-before-use invariant

`PRICE_APPROVED -> CHECKOUT -> PAYMENT_CLEARED -> ENTITLEMENT_ACTIVE -> BILLABLE_USE_ALLOWED`

An order row, browser success page or pending/processing status is never enough to activate paid access.

## Entitlement states

- PENDING_PAYMENT
- ACTIVE
- PAYMENT_WARNING
- SUSPENDED_NONPAYMENT
- SUSPENDED_RISK
- CANCELLED

At the configured payment due time, if payment is not cleared, enter PAYMENT_WARNING and set `suspend_at = due_at + 60 seconds`. At `suspend_at`, re-read the authoritative server-side payment state. If still unpaid, atomically enter SUSPENDED_NONPAYMENT.

A verified cleared payment automatically changes SUSPENDED_NONPAYMENT back to ACTIVE. Recovery must be idempotent and evidence-producing.

## Suspension boundary

SUSPENDED_NONPAYMENT blocks AI execution, paid connectors, external side effects, new billable jobs and billable background automation. It must not block sign-in needed to pay, billing screens, invoices/payment status, security recovery or lawful data export/exit. Suspension never deletes Room history, customer data, Legal Vault, Accounting Vault or evidence.

## AI usage billing metadata

Billable execution records only the minimum billing metadata: tenant/customer billing reference, Room/catalog/product ID, provider ID, model ID, usage units, rate schedule version, management-fee schedule version, timestamp, execution/evidence ID and idempotency key. Billing must not read Legal/Accounting vault payload bodies.

## Room price schedule

Each Room resolves to a versioned owner-approved price schedule: catalog ID, base amount/currency, interval, AI rate-plan ID, management-fee plan ID, Specialty Pack references, effective dates, owner approval evidence and active state. Missing/expired/unapproved schedules fail closed.

## Management fee

RC Management Fee is a separate billing line. Supported plan shapes: fixed recurring, fixed per billable execution, percentage markup on eligible metered usage, or hybrid. Actual customer-facing rates come only from Owner-approved schedules.

## Provider-neutral payment adapter

Required capabilities: checkout/payment intent, subscription management where supported, signed webhook verification, canonical payment-state normalization, reconciliation, idempotency, refund/cancel/dispute/chargeback representation, provider references, and no PAN/CVV storage in Royal Command data.

## Webhook authority

Browser/client success is not payment evidence. Entitlement activation/recovery requires server-side verified provider evidence or equivalent reconciliation. Duplicate provider events must not double-charge, double-activate or duplicate ledger entries.

## Risk separation

Ordinary cleared payment automatically clears SUSPENDED_NONPAYMENT only. Fraud/security/legal/chargeback blocks use SUSPENDED_RISK and payment alone does not override them.

## Alerts

At minimum: payment warning at due_at, visible 60-second countdown, suspension notice, restored-access notice, and internal evidence event for each transition. Notification delivery failure does not change authoritative state.

## Current repository gap

The repository already marks paid services pending_payment and can create payment order rows, but `checkoutConfigured: false`; real money collection is not complete. The existing commercial firewall also blocks all automated price display, so it must distinguish Owner-approved published catalog prices from custom quotes.

## Production gate

Production activation remains blocked until a real payment provider, sandbox E2E, signed-webhook verification, idempotency/reconciliation, refund/cancel/dispute handling, nonpayment suspension/recovery tests, exact-head CI/security evidence, and Owner-approved price schedules pass.
