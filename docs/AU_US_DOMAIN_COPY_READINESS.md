# Royal Command — Australia / United States Domain Copy Readiness

Status: PREPARED — production DNS/Vercel attachment intentionally not changed by this document
Date: 2026-08-21

## Purpose

Prepare the approved Royal Command shared application so the same Common Core can be used on the Australia and United States public domains without creating separate incompatible codebases.

## Approved shared-core rule

- Keep one Royal Command application/core.
- Do not copy and maintain separate AU and US source trees.
- Country differences belong in country configuration and integrations.
- Command Room UI remains shared unless Harry explicitly approves a country-specific UI difference.

## Current public-domain routing

| Domain | Country mode | Locale | Currency | Phone code |
| --- | --- | --- | --- | --- |
| `atyourcommandai.com.au` | Australia | `en-AU` | AUD | +61 |
| `www.atyourcommandai.com.au` | Australia | `en-AU` | AUD | +61 |
| `atyourcommandai.com` | United States | `en-US` | USD | +1 |
| `www.atyourcommandai.com` | United States | `en-US` | USD | +1 |
| `royalcommand.ai` / `www.royalcommand.ai` | Global Core | existing global behavior | existing | existing |

Canada may be explicitly selected on the North America domain while US remains its default. Australia cannot be overridden by a Canada selection.

## What is already separated safely

### Australia
- AUD currency
- +61 phone code
- DD/MM/YYYY dates
- Australian IANA timezones
- Australian states and territories
- ABN / ACN fields
- GST tax structure placeholder
- AU-specific phone, legal, privacy and investment integration placeholders

### United States
- USD currency
- +1 phone code
- MM/DD/YYYY dates
- US IANA timezones
- 50 states plus District of Columbia
- EIN / state-of-incorporation fields
- US-specific phone, legal, HIPAA/medical and investment integration placeholders

## Production activation checklist

Before either country domain is pointed at production, complete all items below for that domain.

### Mandatory launch-authority boundary

The current repository has no runtime route that performs country READY promotion, Vercel domain attachment, or DNS activation. Those activation actions are therefore an external/manual operational boundary today.

Immediately before any DNS/Vercel/domain activation side effect, the operator must evaluate the canonical `evaluateCountryOperationalLaunch()` gate from `src/config/countryLaunchGate.ts` using evidence for the exact country, `HOSTED_PRODUCTION` environment, release candidate SHA, linked migration apply-set fingerprint, Room Factory/template fingerprint, and Hosted operational-data fingerprint. Proceed only when the recorded result is `launchable === true`; otherwise stop without changing traffic, domain binding, Production state, or customer availability.

The legacy `countryOperationalLaunchGate.ts`, a configuration-only READY status, Preview/disposable evidence, or evidence from another release/country cannot substitute for this authority decision. If a future automated country-activation path is added, it must invoke the canonical operational gate immediately before its external side effect and regression-test that a blocked gate performs no side effect.

1. Record the canonical `evaluateCountryOperationalLaunch()` result and verify `launchable === true` for the exact activation scope.
2. Confirm Royal Command controls the exact domain and DNS account.
3. Add the exact apex and `www` domain to the intended Vercel project.
4. Verify DNS records before changing traffic; do not overwrite unrelated records.
5. Confirm TLS/HTTPS is issued and both apex and `www` resolve as intended.
6. Confirm Supabase authentication redirect/callback URLs allow the exact production domains.
7. Confirm cookies/session settings work across the intended host only; do not unintentionally share authentication across unrelated domains.
8. Confirm country resolver returns AU for `.com.au` and US for `.com`.
9. Confirm AU displays AUD/+61/AU date/address rules and US displays USD/+1/US date/address rules.
10. Confirm country-specific payment, tax, legal/compliance and telephone integrations before enabling them for customers.
11. Run login, signup, Command Room, AI chat, voice/speaker, file upload and logout smoke tests on each final domain.
12. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` before production merge/deployment.
13. Preserve rollback: keep the last known-good production deployment available until both domains pass smoke testing.

## Safety rule for future domains

When a new country domain is purchased, do not duplicate the application. Add the domain to the host-to-country resolver, add/complete that country's configuration, add routing tests, pass the same canonical operational launch-authority boundary, then attach the domain after DNS/hosting/auth checks.

## Current intentional blockers

The country configuration files still mark legal, tax, medical/investment/privacy and several external integrations as `NEEDS_REVIEW` or `NOT_CONNECTED`. Those placeholders are correct and must not be represented as production-complete services until the corresponding country work is approved and connected.

## Verification added

Automated tests in `src/config/countryResolver.test.ts` lock the expected AU, US, Global Core and Canada-selection routing behavior, including host casing and port normalization.

`src/config/countryLaunchAuthority.test.ts` also locks the canonical operational-gate requirement into this activation checklist so the manual/external boundary cannot silently fall back to the weaker legacy gate or a configuration-only READY decision.
