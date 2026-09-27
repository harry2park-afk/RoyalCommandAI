# Hosted Customer Number Authority Evidence — 2026-09-25

Status: **READ-ONLY evidence; launch HOLD**

This record captures the current Hosted Supabase shape relevant to October country rollout. It does not authorize Production deployment, migration repair/replay, customer-number allocation, or Country READY.

## Stable boundary

- Production `master` baseline before this evidence record: `33da2a917dc6adcf266f59f0b27d18a56f1271d8`.
- PR #856 pre-evidence exact head: `e7b35d4850c13cc2317229d0fe628043b55c9a25`.
- Restore ref: `restore/2026-09-25-0348-pr856-pre-customer-number-evidence`.
- Hosted Supabase was queried read-only only.

## Hosted migration ledger

The Hosted migration ledger contains:

- `20260920091809 / add_secure_rc_customer_numbers`
- `20260922021440 / rcv3_preview_email_outbox`

The expected Git source for `20260920091809_add_secure_rc_customer_numbers.sql` is still not present in repository code/history searches. Older August commits mentioning "customer number" are UI/manual work and do not contain this Hosted migration.

Therefore the row-76 source/reviewer authority remains unresolved.

## Current Hosted objects

`public.rc_customer_accounts` exists as a regular table owned by `postgres`.

Columns observed:

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| owner_id | uuid | NOT NULL | none |
| customer_number | text | NOT NULL | none |
| customer_sequence | bigint | NOT NULL | none |
| created_at | timestamptz | NOT NULL | now() |
| updated_at | timestamptz | NOT NULL | now() |

Unique constraints/indexes observed:

- primary key on `owner_id`
- unique `customer_number`
- unique `customer_sequence`

`public.rc_customer_number_seq` exists with:

- start value: `357071`
- increment: `1`

No non-internal trigger was observed on `rc_customer_accounts`, and no public/private function name matching the customer-number allocation pattern was found by the read-only catalog query.

## RLS and direct authority

RLS policy observed on `rc_customer_accounts`:

- `rc_customer_accounts_read_own`
- command: SELECT
- role: authenticated
- predicate: owner owns the row

However, the table ACL still grants `authenticated` the following privileges:

- SELECT
- INSERT
- UPDATE
- DELETE
- TRUNCATE
- REFERENCES
- TRIGGER

RLS currently prevents ordinary row writes where no write policy exists, but these broad table/control-plane grants are not acceptable evidence of a reviewed least-privilege customer-account boundary. They also make the authority contract depend on the absence of future write policies rather than an explicit deny-by-privilege design.

## Launch implication

`customerAccountAuthority` must remain **NOT VERIFIED** for AU/US/CA/KR/JP/GB until all of the following are independently proved:

1. exact Git source and reviewer/deployment provenance for the Hosted customer-number migration;
2. controlled non-Production replay against the Hosted-shaped schema;
3. authenticated direct mutation/control privileges reduced to the intended minimum;
4. owner read behavior preserved;
5. customer-number allocation occurs only through an approved trusted path;
6. negative authenticated tests prove allocation/number mutation cannot be forged;
7. rollback/deny-path evidence is retained.

No Country READY state may be inferred from the existence of the table or sequence alone.
