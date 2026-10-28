# RC V3 email delivery — Preview status

Owner instruction (22 September 2026): only card-expiry/update reminders may be automatic. Every other notice, including payment success/failure, requires Harry's approval of the actual recipient and rendered text. Approval to build this feature is not approval to send a message.

Implemented:
- RC-only Email Review in the shared toolbox; save a single-recipient draft, view its exact text, approve or reject. No customer access to approval data.
- Server-side digest binds approval to the immutable message and recipient. Editing requires a new draft and approval. AI has no approval API privilege of its own.
- Durable service-role-only outbox with atomic claim, frozen sender/payload, stable provider key, accepted status, and safe retry cutoff. Provider acceptance does not prove delivery. Ambiguous attempts after 23 hours stop for manual reconciliation; do not create replacement sends blindly.
- Current Stripe subscription/default card and confirmed RC account email are checked before enqueue and again before sending. Expiry reminders occur within 30 days of month end, plus one expired reminder within the following 30 days. New card/expiry/recipient or inactive subscription cancels stale queued advice. Notices are deduplicated per room/card/expiry/category; shared cards used in multiple rooms can receive a notice per room.
- Email Update Card links preserve room/billing context through login and open authenticated Stripe billing management. No raw card numbers/CVV are collected or emailed by RC.
- A scheduler-callable POST `/api/rcv3/email-worker` scans five activated orders and processes three notices per invocation; its persisted cursor cycles through the order list. Per-order lookup errors are isolated and recorded. The scheduler must invoke repeatedly, e.g. every five minutes, to drain a growing queue. This is not an installed schedule.

Deployment gates still outstanding:
- Configure a verified `RCV3_EMAIL_FROM`, server-only `RESEND_API_KEY`, `RCV3_EMAIL_ENABLED=true`, dedicated random `RCV3_EMAIL_WORKER_SECRET` (32+ characters), and explicit comma-separated `RCV3_EMAIL_TEST_RECIPIENTS` on the approved Preview branch.
- Configure a Preview-capable external scheduler to POST the worker with `Authorization: Bearer <worker secret>` and the deployment protection credentials required by the platform. Do not put secrets in Git, email, or browser code. Vercel Production cron is not configured by this change.
- Verify a test recipient inbox and the hosted owner approval flow. No live customer email has been sent by this work.
- The transport deliberately rejects Production and recipients outside the test allowlist. Production rollout and real customer delivery remain outside this Preview task.

Database: additive migration `20260922021440_rcv3_preview_email_outbox.sql` applied to RoyalCommand. Both new tables have RLS enabled, no anon/authenticated table grants, and only service-role select/insert/update. Existing customer data and Katie Gmail configuration are unchanged.

Risk: HIGH-RISK (customer communication/authorization). Root is writer for outbox/payment; toolbox reviewer owns UI changes; independent reviews found and fixed poisoned sweep and cross-room dedup issues. Relevant unit tests mock provider/network and exercise unauthorized transport, altered content, concurrent claims, expiry/replacement cards and retry cutoff. Hosted UI and actual mail delivery remain unverified.
