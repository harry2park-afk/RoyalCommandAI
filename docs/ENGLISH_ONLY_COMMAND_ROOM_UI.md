# English-only Command Room UI rule

The reusable Royal Command Command Room shell must not expose Korean UI labels in the shared international base.

- User-authored conversation content may remain in the user's language.
- Auto-generated UI labels, conversation titles, controls, status text, placeholders, and navigation chrome must be English in the shared base.
- A non-English user message must never become a visible non-English automatic sidebar title. Use an English neutral label such as `Conversation 1` instead.
- Country-specific localisation should be added only in that country's localisation layer, not hard-coded into the shared base UI.
