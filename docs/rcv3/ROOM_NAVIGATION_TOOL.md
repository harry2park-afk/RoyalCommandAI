# Shared room navigation tool

Tool ID: room-list. Implementation: src/components/rcv3-toolbox/RoomNavigation.tsx.

- Function: search authenticated owner-scoped created rooms, load further pages, and open a selected room directly. Names remain customer-authored.
- Basic return: displays `← actual name` only when the caller supplies an authoritative owned basic-room mapping. No guessing from oldest/newest/current room.
- Configuration: account language, current room ID, verified basic room if available, disabled state and existing room-open callback.
- Safety: server ownership/status filtering and destination access checks remain enforced. No new room, payment or entitlement is created. Unsaved edits disable navigation.
- Failure: empty, loading and retry states; aborted stale searches do not replace newer results. Native modal supports keyboard Escape and focus handling.
- Phone/tablet: one-column searchable list with 44px controls and scrollable dialog.
- Registration first: component, API path, registry description, inventory and tests are saved before screen consumption.
- Limitation: current account/signup source has no canonical basic-room ID. Basic-return wiring cannot be considered complete until that association is implemented and verified.
