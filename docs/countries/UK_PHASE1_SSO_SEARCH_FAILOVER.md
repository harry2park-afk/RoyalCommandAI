# Royal Command UK — Phase 1 SSO, Search and Failover Brief

Status: Harry Park approved
Lead AI: Claude
Country: United Kingdom
Primary candidate domains: royalcommand.co.uk and royalcommand.uk

## Objective
Build the UK Royal Command deployment from the approved shared Royal Command base frame. The UK build must keep both UK domains interoperable while preserving independent deployment/failover capability.

## 1. SSO architecture
The two UK domains are different registrable domains, so browser cookies cannot be directly shared between them. Do not attempt a `Domain=` cookie hack across `.co.uk` and `.uk`.

Use a central OpenID Connect (OIDC) identity provider and authorization-code flow. Preferred implementation order:
1. Auth0 custom login domain, or another standards-compliant OIDC provider.
2. Keep the application-side integration provider-neutral so Auth0 can later be replaced by Cognito, Keycloak, or another OIDC provider without rewriting the country apps.

Recommended flow:
- User opens royalcommand.co.uk.
- If no local app session exists, redirect to the central OIDC `/authorize` endpoint.
- The identity provider holds the SSO session.
- After authentication, redirect back to royalcommand.co.uk callback and create a local HttpOnly/Secure/SameSite=Lax app session.
- When the same user later opens royalcommand.uk, that app redirects to the same central OIDC provider. The provider recognises the existing SSO session and returns immediately, so the second domain becomes logged in without asking for credentials again.
- The reverse direction works identically.

Security requirements:
- Authorization Code + PKCE where supported.
- `state` and `nonce` validation.
- HttpOnly, Secure application cookies.
- Never put long-lived tokens in localStorage.
- Short-lived access tokens; rotate/refresh through the identity provider.
- No shared universal master credential.

## 2. Existing Royal Command auth integration
Current Royal Command uses Supabase Auth when configured and a local demo session fallback. Do not remove that path until UK SSO is proven.

Migration strategy:
- Add OIDC as an additional auth mode behind environment configuration.
- Keep current Supabase mode as rollback/fallback during migration.
- Both UK deployments must use the same identity tenant/user directory.

Suggested environment contract:
- RC_AUTH_MODE=oidc|supabase
- RC_OIDC_ISSUER=https://<central-idp-domain>/
- RC_OIDC_CLIENT_ID=<per-app-or-shared-client-id>
- RC_OIDC_CLIENT_SECRET=<server-only secret if required>
- RC_OIDC_REDIRECT_URI=https://royalcommand.co.uk/api/auth/oidc/callback (deployment A)
- RC_OIDC_POST_LOGOUT_REDIRECT_URI=https://royalcommand.co.uk/
- Equivalent redirect variables for royalcommand.uk deployment B

Do not commit secret values.

## 3. Shared search/data architecture
Both domains must return identical search results by reading from one logical shared data source/index.

Preferred order:
1. Reuse the existing central Royal Command PostgreSQL/Supabase data as source of truth.
2. Add a shared search service only when full-text/ranking scale requires it (Algolia/OpenSearch/Elasticsearch).
3. Both UK frontends call the same versioned search API contract.

Recommended endpoint contract:
GET /api/search?q=<query>&country=GB

Rules:
- Same tenant/user authorization rules on both domains.
- Country filter defaults to GB where appropriate, but shared/global records remain visible according to permissions.
- Search index updates are driven from the source-of-truth database, not separately from each frontend.
- Do not keep independent divergent indexes for `.co.uk` and `.uk`.

## 4. Failover architecture
Requirement: the two UK public domains must be independently deployable and one must remain available if the other application deployment fails.

Recommended topology:
- royalcommand.co.uk -> UK App Deployment A
- royalcommand.uk -> UK App Deployment B
- Separate deployment/runtime targets and independent DNS records.
- Shared identity provider is multi-zone/high-availability managed OIDC, or an HA self-hosted OIDC cluster.
- Shared database/search services must use their own HA/backup strategy.

Important: two independent app deployments do not provide true failover if both depend on a single non-HA database, identity service, or search node. Treat identity, database, search, telephony webhooks, and secrets management as separate failure domains.

## 5. React/Next/Tailwind compatibility
The UI remains the shared Royal Command React/Next/Tailwind frame. SSO is implemented server-side in Next.js route handlers/middleware; no visual redesign is required.

Retell AI and Twilio remain service integrations behind authenticated APIs. They should use central Royal Command user/tenant IDs and must not create a separate identity system.

## 6. UK implementation sequence for Claude
1. Verify Royal Command ownership/control of `royalcommand.co.uk` and `royalcommand.uk` before DNS changes.
2. Confirm the selected OIDC provider and central login domain.
3. Add OIDC configuration and callback routes without removing current Supabase auth.
4. Add a provider-neutral session adapter so `getCurrentUser()` can read the selected auth mode.
5. Configure both UK domains as allowed callback/logout origins at the identity provider.
6. Point both applications to the same shared search/data service.
7. Deploy UK App A and UK App B independently.
8. Run SSO, search consistency and failover tests below.
9. Only after tests pass, make UK production DNS changes with Harry approval.

## 7. Acceptance tests
### SSO
- Private/incognito browser, open royalcommand.co.uk and sign in.
- Open royalcommand.uk in a new tab.
- It may perform a short redirect through the central identity provider, but must not ask for credentials again.
- Repeat in the reverse direction.
- Log out according to the chosen global/local logout policy and verify expected behaviour on both domains.

### Search
- Search the same phrase on both UK domains.
- Verify the same authorized result set and ranking/version.
- Create/update a searchable record, wait for indexing if applicable, and verify both domains receive the same change.

### Failover
- Take UK App Deployment A out of service in a controlled test.
- Verify royalcommand.uk (Deployment B) continues to authenticate and search normally.
- Repeat in reverse.
- Separately test identity/search/database failover or documented managed-service HA guarantees.

## 8. Non-negotiable rules
- Preserve the shared Royal Command base frame.
- UK-specific code/config stays isolated from common reusable code.
- Do not invent domain ownership.
- Do not expose secrets in source or client JavaScript.
- No cross-TLD cookie sharing attempt.
- Keep provider lock-in low by using OIDC standards and a thin provider adapter.
- Material production changes remain subject to Harry approval.
