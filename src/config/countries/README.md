# Country Configuration Modules

Each country module in this directory is a local configuration layer for the shared Royal Command core.

To add a future country:

1. Add one validated `<country-code>.json` module matching `CountryConfig`.
2. Register it in `src/config/countryResolver.ts` under `COUNTRY_CONFIGS`.
3. Add only verified public domain aliases under `DOMAIN_BINDINGS`.
4. Add routing/config tests before activation.
5. Complete `docs/ROYAL_COMMAND_100_COUNTRY_PLATFORM_READINESS.md` launch checks.

Do not copy the whole application for each country. Do not store secrets or credentials in these files.
