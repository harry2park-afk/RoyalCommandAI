# Royal Command Incident Monitoring

## Purpose
Detect and record Room failures before customers need to explain what happened.

## P1 incidents
- React Error Boundary crash
- Unhandled browser JavaScript error
- Unhandled Promise rejection
- Room root DOM disappears while page remains active

## What is recorded
- incident UUID
- severity (P1/P2/P3)
- event type
- Room ID
- request ID when available
- URL
- error name/message
- stack trace
- browser user agent
- Vercel deployment ID/URL
- Git commit SHA
- timestamp

No passwords or full chat transcript are intentionally stored in incident_events.

## Storage
Supabase table: `public.incident_events` with RLS enabled.
Customers cannot read the global incident table directly.

## Immediate alerts
All P1/P2 incidents are also written to Vercel runtime logs with markers:
- `[RC-P1-ALERT]`
- `[RC-P2-ALERT]`

Optional external instant notification is supported through the Vercel environment variable:
`RC_ALERT_WEBHOOK_URL`

When configured, Royal Command POSTs a JSON alert payload to that URL with a 4 second timeout. Monitoring failures never crash the Room.

## Production rule
Changes to monitoring are developed on `room-stability`, verified in a Vercel Preview deployment, and only then promoted to `master` / Production.
