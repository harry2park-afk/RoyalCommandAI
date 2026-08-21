# Royal Command 100-Country Platform Readiness

Status: Architecture guardrail for future rollout
Date: 2026-08-21

## Objective
Prepare one Royal Command shared core to support country-by-country activation across approximately 100 countries without cloning the application into incompatible codebases.

## Core rule
There is one shared Royal Command application core. Country launches are configuration + verified domain + country integrations, not separate product forks.

## Country onboarding contract
Every future country must provide or confirm these items before public activation:

1. ISO-style country code used internally.
2. Country configuration file covering locale, currency, phone country code, date/time/address formats and timezones.
3. Public Royal Command domain(s), added only after ownership and DNS/hosting are verified.
4. Authentication callback / redirect allow-list for that domain.
5. Cookie/session behavior verified across apex and www hostnames.
6. Local legal/privacy/compliance status reviewed; no placeholder may be presented as completed compliance.
7. Tax structure and tax provider status.
8. Payments and settlement currencies/provider readiness.
9. Telephony/SMS numbers, emergency limitations and local communications rules where applicable.
10. Country-specific business identifiers and address fields.
11. Language/translation behavior and locale fallback.
12. Data residency / cross-border data requirements where applicable.
13. Local integrations required for launch.
14. Automated routing tests and country-config validation.
15. Preview deployment, smoke test, rollback path, then production activation.

## Architecture rules
- Country routing must remain data-driven; do not add long chains of country-specific if/else branches.
- Unknown or unverified domains must never guess a country.
- Global domains continue to use Global Core behavior unless an approved future rule explicitly changes that.
- A country may be configured before its domain goes live, but an unverified domain must not be silently activated.
- Secrets, API keys, phone credentials and payment credentials never belong in country JSON files or source control.
- Shared improvements belong in the common core and must remain reusable across all countries.
- Country-specific legal, tax, medical, investment and privacy claims must keep explicit readiness states until reviewed.

## Current implementation
`src/config/countryResolver.ts` now exposes a generic country registry and a data-driven domain binding registry. AU, CA and US remain the currently configured country modules. Future countries can be added by registering a validated country config and verified domain binding without rewriting resolver control flow.

## Scale target
The resolver and onboarding process are intended to support 100+ country entries. The number of country modules can grow without creating 100 separate applications.

## Launch safety gate
No country domain is production-ready solely because a config exists. Production activation requires the onboarding contract above, successful automated tests, preview verification and an explicit approved deployment step.
