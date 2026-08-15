# Royal Command Room Stability Policy

1. Do not make iterative UI experiments directly on production.
2. Test Room UI/client-side changes on a staging branch first.
3. Production promotion requires: build READY, /api/ai/providers 200, Room page loads, AI box toggles, one ChatGPT-only send succeeds, and no new runtime errors.
4. Avoid MutationObserver/DOM-rewrite scripts for React-owned Room UI. Implement UI state in React/CSS.
5. Keep a Room error boundary so client render failures never become an unexplained blank page.
6. Prefer one tested production deployment over many small live deployments while users are chatting.
