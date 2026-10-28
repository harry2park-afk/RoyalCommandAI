# Country Configuration Modules

Each country module in this directory is a local configuration layer for the shared Royal Command core.

To add a future country:

1. Add one validated `<country-code>.json` Pack with a unique `country-*` ID and explicit status.
2. Add the matching Region and Policy Packs when they do not already exist.
3. Add the domain to `domainAssets.json` with `runtimeEnabled=false`.
4. Run `npm run generate:domain-packs`; no Core resolver edit is required.
5. Add routing/config tests and complete `docs/DOMAIN_CORE_ROLLOUT_PLAYBOOK.md` before activation.

Do not copy the whole application for each country. Do not store secrets or credentials in these files.
