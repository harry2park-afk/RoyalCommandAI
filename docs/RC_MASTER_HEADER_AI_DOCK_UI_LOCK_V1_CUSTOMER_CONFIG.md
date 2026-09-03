# RC Master Header / AI Dock UI Lock v1 — Customer Configuration Freedom

## Principle

The RC Master UI safety lock protects shared framework integrity. It does not prevent customers from changing supported preferences.

Customers may change supported settings through product configuration and preference controls. The shared Master implementation remains the single source of truth.

## Supported change categories

Examples include:

- AI provider selection where available.
- AI display/order preference where available.
- Language and locale selection.
- Country-specific policy/configuration values supplied through approved overlays.
- Other documented user preferences.

## Prohibited implementation pattern

Do not create a customer-specific or country-specific copy of the Header / AI Dock just to express a preference.

If a requested customization is not yet supported, add a reviewed configuration contract rather than forking shared UI code.
