# RC Headquarters Admin Boundary v1

Status: ACTIVE ARCHITECTURE RULE

## Purpose

The Visual Layout Editor and related design/administration controls are Royal Command Headquarters tools. They are not country-edition features and must never appear in RCA or any other country/customer surface.

## Current HQ boundary

Until the dedicated Headquarters control plane is moved to Google Cloud, the only production hosts allowed to expose or execute Layout Editor administration are:

- `royalcommand.ai`
- `www.royalcommand.ai`

All other production hosts are non-HQ by default.

## Mandatory rules

1. Layout Editor UI shortcuts are visible only on an RC Headquarters host.
2. Country editions, including RCA, must not render the Layout Editor shortcut.
3. Hiding the button is not the security boundary. Server-side Layout Editor authorization must also reject non-HQ hosts.
4. HQ host authorization is in addition to, not instead of:
   - authenticated Royal Command account,
   - administrator role,
   - trusted-device binding,
   - passkey / platform verification,
   - short-lived editor session.
5. Customer Passkey and account-security features remain separate and may exist outside HQ. The protected Layout Editor itself remains HQ-only.
6. Country Pack, locale overlay, customer preference, or Room Identity logic must never enable HQ tools.
7. New country domains default to HQ tools OFF.

## Future Google Cloud separation

Target architecture:

- Customer / country services remain on their normal public application domains.
- RC Headquarters moves to a dedicated admin domain such as `hq.royalcommand.ai` or `admin.royalcommand.ai`.
- The Headquarters service is hosted separately on Google Cloud and protected by dedicated identity/access controls in addition to Royal Command Passkey / Trusted Device controls.
- When that cutover is approved, `RC_HEADQUARTERS_HOSTS` becomes the deployment-controlled allowlist for the new HQ domain, and the public `royalcommand.ai` hosts can be removed from the HQ allowlist.
- No country edition is to receive a copy of the HQ admin application.

## Change-control requirement

Any change that widens the Headquarters host allowlist, weakens trusted-device or passkey enforcement, or exposes Layout Editor controls on a country/customer domain is HIGH-RISK and requires explicit RC Headquarters approval, exact-head CI, Preview verification, and a rollback point.
