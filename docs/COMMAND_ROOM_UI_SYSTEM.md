# Command Room UI System v1

Purpose: prevent repeated one-off CSS values and cross-component visual regressions.

## Approved control size
Compact control height: 30px.

Applies to the current compact Command Room controls unless the owner explicitly requests otherwise.

## Current semantic control colors
- SAVE: bright green emphasis.
- DELETE: bright red emphasis.
- Selection checkbox: white surface with blue outline/accent.
- New Chat / Voice outline: Command Room blue.
- AI active/inactive styling follows the owner-approved compact dock behavior.

## Typography
Customer content may be in any language. UI labels for the international product should remain English unless localization is explicitly being implemented.

Conversation titles:
- Default title = customer's first chat message text.
- Custom title = exact customer-entered title, unrestricted by language.

## Interaction rules
- No unsolicited external AI/browser tab on Room entry.
- DELETE selected conversations follows the current owner-approved direct-delete behavior without a browser confirmation popup.
- Manual message scrolling must never be repeatedly overridden by helper scripts.
- Title-edit inputs must never be rewritten by DOM helper scripts.

## Architecture rule
New shared visual values should be implemented in source components/tokens rather than copied into new DOM-mutation helper scripts.
