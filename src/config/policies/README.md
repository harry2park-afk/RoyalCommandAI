# Policy Packs

Add a JSON Pack with a unique `policy-*` ID and explicit status. Every capability must be explicitly `READY`, `NEEDS_REVIEW` or `BLOCKED`; missing capabilities are blocked. A runtime-enabled domain fails closed unless its Policy Pack exists and the Pack itself is READY.
