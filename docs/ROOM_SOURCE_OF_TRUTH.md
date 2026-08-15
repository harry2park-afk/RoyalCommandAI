# Royal Command Room UI Source of Truth

The Room UI must be controlled by React/route CSS source only.

Rules:
- Do not use MutationObserver or DOM-rewriting scripts to restyle Room controls.
- Do not load legacy `rc-room-*.js` UI override scripts into the Room runtime.
- Any approved visual state must live in `RoomV3.tsx`, `rooms/[id]/layout.tsx`, or the relevant React component.
- Preview-test changes before Production.
- Production must never depend on browser-side patch scripts for the approved Room appearance.
