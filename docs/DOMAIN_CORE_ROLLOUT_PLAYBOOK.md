# Royal Command Core — 22 Domain Connection Playbook

Status: Preview-first operating procedure. Production activation requires separate approval and exact-head evidence.

## Architecture

Maintain one application and one RC Headquarters Core. A domain selects configuration through this order:

`CoreConfig → RegionOverlay → CountryOverlay → domain locale/currency overrides → PolicyOverlay`

`src/config/domainAssets.json` is the domain inventory and activation authority. Country, Region and Policy JSON files are discovered by `scripts/generate-domain-pack-registry.mjs` during build. Do not add country-specific branches to shared Room, API or UI code.

## Copy and connection boundary

Copy or deploy:

- the exact tested Core commit;
- shared application code and immutable static assets;
- the applicable Region, Country and Policy Pack definitions;
- empty infrastructure definitions and reviewed migrations when a separate environment is required.

Never copy between domains:

- customer rows, conversations, documents, memory, recordings or analytics identities;
- Supabase database contents, Auth users or Storage objects;
- cookies, sessions, refresh tokens, OAuth state or trusted-device records;
- `.env` files, API keys, encryption keys, service-role keys or provider credentials;
- domain ownership proofs, private certificates or another domain's DNS tokens.

## Values required for each domain

1. Add or update one entry in `domainAssets.json` with the verified hostname and intended binding.
2. Select the correct `regionCode`, `countryCode`, `countryPackId` and `policyPackId`.
3. Confirm locale, currency, timezone, phone country code, date/address formats and subdivisions in the Pack.
4. Mark unsupported legal, tax, privacy, medical, investment, payment and external-provider features `NEEDS_REVIEW` or `BLOCKED`.
5. Keep `runtimeEnabled=false` until all operational checks are evidenced.

A new Country Pack is a JSON file under `src/config/countries`; a Region Pack belongs under `src/config/regions`; a Policy Pack belongs under `src/config/policies`. Each Pack requires a unique `packId` and explicit `status`. Build generation updates the typed Registry without editing Core resolver code.

## Auth, cookies and OAuth

- Use exact Production redirect URLs in the Supabase Auth allowlist. Wildcards are for controlled Preview URLs, not broad Production matching.
- Keep cookies host-only unless a reviewed central-SSO design explicitly requires otherwise. Never set a parent-domain cookie that unintentionally spans customer or country services.
- Register every OAuth callback URI with the provider before activation. Build callback origins only from a server-validated active hostname.
- Use a separate OAuth state per attempt and bind it to the user, callback origin, expiry and nonce.
- Confirm signup confirmation, password reset, login, logout and refresh on both apex and approved `www` alias.

## Data, Supabase and secrets

- Decide explicitly whether a domain uses the shared tenant-isolated Supabase project or a separate project required by residency/policy.
- Shared projects require RLS ownership/room-membership predicates on every exposed customer table. Domain context is not a substitute for tenant authorization.
- Separate projects receive schema/migrations only—never a copy of Production customer data.
- Provision secrets independently through the deployment platform. Use least-privilege, domain/environment-scoped credentials and rotate any credential accidentally shared.
- Never expose service-role or secret keys through `NEXT_PUBLIC_*` variables.

## DNS, TLS and Vercel order

1. Verify registrar ownership and renewal controls.
2. Add the hostname to the intended Vercel project without changing traffic.
3. Create and verify the exact DNS records.
4. Wait for valid TLS issuance and confirm apex/`www` redirect policy.
5. Configure Auth and OAuth callback allowlists.
6. Record ownership, DNS, TLS, Vercel and Auth evidence in `activationChecks`.
7. Keep runtime disabled and test through Preview or a controlled non-Production hostname.

Registration status alone is not activation evidence.

## Preview-first activation

1. Add Registry and Pack files with `runtimeEnabled=false`.
2. Run Pack generation, typecheck, relevant tests and full build.
3. Verify the Preview resolves the expected `DomainRuntimeContext`.
4. Test home, signup/login/logout, Room loading, AI, locale, currency, phone, uploads and every enabled policy feature.
5. Confirm blocked features remain fail-closed and disabled host access returns unavailable.
6. Capture the exact commit, Preview deployment and rollback deployment.
7. Complete external DNS/TLS/Vercel/Auth checks.
8. In a separate reviewed change, set all `activationChecks=true`, set `runtimeBinding`, then set `runtimeEnabled=true`.
9. Re-run exact-host smoke tests before any wider traffic change.

## Rollback

If any host, Auth, policy or customer-isolation check fails:

1. set the affected domain `runtimeEnabled=false` or restore the last known-good deployment;
2. stop traffic changes and preserve diagnostic evidence without copying customer content;
3. restore prior DNS only when the verified rollback record requires it;
4. repair in Preview and repeat the entire activation sequence;
5. never fix one country by changing shared Core behavior for every domain.

## Applying future RC Headquarters updates

Develop every shared change once in Core. Test it first against Global Preview and representative Region/Country Packs, then run all Registry composition tests. Promote the identical tested commit; do not cherry-pick rewritten domain variants. Country-specific changes remain Pack-only. Use feature readiness in Policy Packs so an RC Core release cannot silently enable an unapproved regulated capability on another domain.
