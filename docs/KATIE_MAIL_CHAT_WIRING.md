# Katie mail chat wiring

STANDARD, single Writer Codex, independent reviewer /root/review. Owner approved
connecting the existing secretary to existing Gmail. Preview only. No OAuth reset,
new credentials, DB changes, automatic sending or telephone activation.

Base 0c3b5767c057abd7784973e6b50b9be01fe6e10d.

Cause: secretary chat classified every mail mention as external approval work, then
called a general helper without mail context. Gmail tab only checked status on a click.
The email counter counted local log strings, not email results.

Change: chat mail read requests use existing authenticated owner-scoped Gmail status,
search and message actions; summarize actual excerpts in Korean. Limit newest 20 inbox
messages and disclose that scope. No write action is callable through this path.
Write-intent requests direct users to the existing content-review/approval interface.
Gmail tab checks status on mount; count now reflects fetched rows, not logs.

Verification: 6 mocked mail integration tests plus 5 secretary route tests passed;
typecheck passed; independent review passed after testing exact 12000-char prompt limit
including JSON escapes. Failures never pretend to read mail; AI failure shows actual
message subjects. Original task/chat records retained, including old approval entries.

Live account read and Korean report remain to be verified in Harry's signed-in browser;
the assistant browser lacks that session. Connected status alone does not prove token
refresh/read scope works. No message was sent or deleted during this work.
