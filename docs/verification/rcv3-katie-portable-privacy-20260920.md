# RC V3 Katie privacy and recovery

HIGH-RISK privacy lane. Sole writer: root. Independent read-only reviewers:
katie_review and copy_security_review. Continuing owner approval covers Preview
changes only. Production/master and existing telephone configuration unchanged.
Baseline: 1a203f82ab02f684f7d698221a566ed46a4ca94b.

## Customer-copy boundary

Common chat, secretary and file capabilities survive copying. Every copied button
gets a fresh identity and canonical label. Uploaded assets, source names/labels,
appearance settings, old identities, provider choices/order and secretary room
references do not travel. A fresh product-default AI selection remains available;
no source account credential is copied. Local SQLite cloning follows the same
policy. The source is not modified.

New V3 Katie opens its own room when no existing secretary was explicitly linked.
Gmail is disabled in fresh/copied rooms, including copies owned by Harry. An
explicit UI action enables the current owner's Gmail through the existing
owner/origin/revision-protected state API. Status and read/send APIs enforce this
before accessing Google; user-specific OAuth is still required. New customer
access is restricted to owned Preview V3 rooms. Approval remains required to send.
Customer-specific names and Australia-only drafting instructions were removed
from shared email prompts.

Copy is owner-authorized only. This is NOT an implemented cross-customer template
publishing/installing service. No private source can be read by another owner.
Telephone UI/read functionality remains, but customer number verification and
service binding must be completed before calls can reach a new room. No number,
Retell binding or outbound call setting is copied or changed.

## Earlier requested repairs included

RC V3 return context survives the Katie entry and room picker. Header title is
in normal flow, avoiding the global absolute-title selector on phones.
After a realtime transport timeout, the next explicit microphone click uses the
existing recorded-audio transport with automatic language recognition. It never
restarts capture automatically or replays an order. Recorded mode finalizes text
after a pause. Answer timeout stops capture and suppresses late playback.

## Evidence

67 focused Vitest checks and 16 RCV3 node checks passed. Next production build
passed. Checks include sentinel private data, new button IDs, source preservation,
source ownership refusal, injected ownership/connection fields, template creation,
Gmail opt-in gating for both Harry and other owners, and voice cancellation.
Both independent reviewers approved Preview verification after the account-wide
Gmail auto-read issue was closed. Physical microphone/speech is not certified by
simulated audio tests. Live Preview verification follows deployment; no completed
customer installation or operational customer telephone claim is made here.
