# Katie received-mail repair — Preview only

STANDARD. Lane: Katie Gmail status, listing and read-only review. Sole writer: root Codex;
independent read-only reviewer: katie_review. User authorized repair and Preview application.
CODEX_AVAILABLE. No Production/master, DB schema, OAuth scopes, telephone or mail-send changes.
Base/rollback source: 64a05379369b30b5bcf301b52b5f9d60be6b7851 (existing READY Preview).

## Evidence and changes

- Existing signed-in Preview secretary displayed connected, but an actual read returned
  `Token has been expired or revoked.` This is the confirmed access failure.
- Status now verifies Gmail profile access; invalid credentials show reconnect instead of connected.
- Shared read traversal follows continuation pages, deduplicates IDs, bounds concurrency to four,
  handles repeated page tokens, cancellation and partial failures. Page size 100 is not a total limit.
- Scope: received mail, including archived; Sent, Drafts, Spam, Trash excluded. Attachments excluded
  from AI review. All body sections are included in bounded prompts, not clipped to excerpts.
- Katie loads metadata when opened; tab changes keep the component mounted. Full review can start
  before list finishes; it cancels listing, reports progressive batches, and has Cancel.
- Read and AI requests have individual timeouts instead of one 45-second mailbox-wide timeout.
- Review remains on request. This is not a server-side background watcher or scheduled daily report.
- Existing owner authorization and explicit approval for drafts/sending remain unchanged.

## Verification

18 focused tests passed: pagination beyond 20, deduplication, full long-body coverage, disconnected
and late-failure handling, cancellation, token loops, locale messages, API profile verification,
unauthenticated denial, send approval and continuation forwarding. Typecheck passed. Next build
passed. Scoped ESLint has no errors (three pre-existing component warnings). Independent review
approved Preview verification; cancellation text clarity was addressed.

Successful live mail read/review requires Google reauthorization and is NOT yet verified.
Do not label this a completed mailbox review until that final user-authentication step succeeds.
