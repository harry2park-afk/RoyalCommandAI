# Existing room consent control correction

STANDARD UI-only scope approved by Harry, 2026-09-29. Restore tag: recovery/room-consent-20260929-1715 (6f522352).
Reuse existing create-room toolbox component, token handler/API and bank/card controls. No new form, cash ledger, schema, or customer data mutation.

Consent and Create Room remain visible even when account lookup fails. Creation requires saved required fields, sufficient known test tokens, explicit consent and signature. Pending/failed lookup never enables spending. Korean button label follows Harry's explicit request; English uses Create Room.

Verified: four focused mocked component/action tests, TypeScript, toolbox inventory, independent read-only review. Missing-account guidance corrected after review.
Not verified: live browser, actual token debit, saved room, deployed UI. Browser access was previously declined; not bypassed.

Known blockers to full customer request: backend account is restricted to Harry's Preview test tokens; no RC cash wallet/token purchase path found. Existing subscription checkout is not a wallet. No rates invented and no unverified funds credited. Original V4 handoff still targets existing V3 Preview; this isolated patch does not prove V4 completion.
