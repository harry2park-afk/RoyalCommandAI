# Full-screen room gallery

STANDARD; Writer root; Reviewer voice_review. Preview only under continuing owner authorization. Baseline 5768e4899901b1de58b36cd7487c1be19f2cd211. Production/phone/Retell unchanged.

Warehouse now fills the viewport with a search input, category chips and nine visual template cards (one blank and eight geometric room illustrations). Selection calls the existing owner-scoped room provisioning path with an allowlisted template ID. A fresh room receives deterministic button IDs and its own background asset. Only the current room's provider selections and Katie reference are inherited, never conversations/files/history. The original room remains unchanged. Creation failures retain a retry ID; repeated clicks are blocked. The new room opens in placement mode for Save. Connections remain available on their own tab; My Picture and Move Buttons are retained.

Checks: build and TypeScript pass; existing ten RCV3 tests pass; catalog test checks unique IDs, bounded trusted images and no external/script SVG content. Independent review found no material isolation blocker. Existing-room switcher stays absent per owner's earlier explicit UI removal request; records and original URLs remain valid. Real Preview gallery/search/create/save/reload must be checked before claiming success.
