# RC V3 toolbox implementation checkpoint

Status: local implementation and fixture verification; NOT pushed or deployed.
Base: `4bc15820515f05a516bd78c88e369e5acba71bdb`, existing PR #748 branch.
Owner requested GitHub connection/governance diagnosis take priority before further rollout.

- Shared registry: `rcv3/tool-registry.mjs`; 18 installable tools.
- Existing V3 and shared Help control inventory: 76 control definitions. Contextual controls remain in their owning workflow/components; inventory coverage is NOT proof every nested control can run independently or that external services are connected.
- Toolbox entry: `/rcv3`, header `Toolbox`; choose `Add to Room`, then `Edit Buttons` for appearance. No additional route or customer database was introduced.
- Reuses existing chat/files/audio/secretary/learning/meeting/creation handlers and routes. Copy is registered in the toolbox before use in AnswerCards.
- Existing owner access, entitlement checks, immutable bindings, append-only revisions and portable-data allowlists remain enforced.
- Add is idempotent. Save failures roll back. Remove only removes a visible button; it does not delete data or cancel subscriptions.
- Microphone reuses its original toggle and events. Background cancel restores both previous design and image.
- Future V3 controls require registry/inventory review. `npm run check:toolbox` runs before build; it checks source inventory, not live behavior.

## Verified locally

- TypeScript and production build passed.
- 23 relevant Vitest tests and 10 core/dictation Node tests passed.
- New toolbox files pass targeted ESLint.
- Independent review: fixed microphone toggle and stale background-cancel baseline findings.
- Real browser, isolated component harness with in-memory API fixtures: installation of all 18 tools; reload; send/copy/speaker/mic; files/upload; background cancel; help/provider/personal menus; remove/save failure/retry; separate-room preservation; 390px viewport and Escape close passed.
- Browser service responses were fixtures. This is NOT live Preview, real AI/audio delivery, hosted persistence, payment, or customer-service verification.

## Blocking remote completion

Connected GitHub tools return HTTP 400 `Invalid MCP request metadata`, including read-only profile calls. Plugin Management returns the same bridge error. Git over HTTPS can read the public repository; push lacks an authenticated credential. Do not infer a repository permission or rule failure from these transport/authentication errors.

No remote commit, Preview deployment or complete all-button live verification is claimed. Resume from this checkpoint after the connection is repaired; do not rebuild the implemented toolbox from scratch.
