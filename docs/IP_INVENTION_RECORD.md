# Royal Command IP / Invention Record

Status: Working confidential development record

Purpose: Preserve dated technical design decisions and potentially protectable invention concepts while the Royal Command Global Core and N-AI Council Engine are being developed. This record is not a patent application and does not make any claim that a concept is patentable.

## 2026-08-19 — Conversation Engine v2 foundation

### Problem observed
The current orchestration path persisted Room messages but did not forward prior Room conversation to AI providers, so follow-up questions lost conversational context even though the underlying messages were already stored.

### Phase 1 technical decision
Introduce Room-scoped conversational memory without changing the approved Command Room UI or replacing the existing provider connectors. The server loads a bounded set of recent messages for the authenticated Room, converts them into provider-neutral conversation history, and forwards them to each selected provider before the current prompt.

### Architectural constraints retained for future invention review
- Memory remains owned by Royal Command rather than any individual AI provider.
- Context is scoped by tenant/Room boundaries and protected by database access controls.
- Provider identities must not be encoded as fixed memory columns, so future N-AI expansion remains possible.
- Conversation memory, future Council state, provider registry, dynamic routing, quorum/fallback, synthesis and country/region policy are separate modules.
- The future Global Core is intended to support a variable number of AI providers and country/domain configurations without duplicating the core codebase.

### Items to evaluate later with a registered patent attorney / patent professional
- Provider-independent N-AI Council orchestration mechanisms.
- Dynamic capability/role routing across a variable provider set.
- Quorum and graceful-degradation mechanisms for multi-model collaboration.
- Shared Room Memory combined with independent analysis, peer review and synthesis.
- Global country/region policy routing combined with a common AI orchestration core.

### Disclosure control
Do not treat this document as legal advice or as a substitute for a patentability/prior-art search. Before public disclosure of a potentially novel implementation, obtain professional advice on filing strategy and relevant jurisdictions.
