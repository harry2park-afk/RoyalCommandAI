# RCV3 customer controls revision

STANDARD: one writer, independent voice_review reviewer. Preview only. Production and existing Katie runtime/records unchanged.

Compared existing IndependentAIRooms.tsx: preserve independent per-provider request/result behavior and reuse existing connector registry and public SVG brand assets. Do not mount the legacy all-in-one component because its unrelated APIs and histories are outside RCV3 ownership.

Customer header: Warehouse, Katie, Files. No development check, room-copy/new-room controls, duplicate Chat or Customize button, or test-room selector. Existing room records preserved; hiding the test selector does not delete data.

Warehouse imports a blank functional layout or customer picture; pointer-drag placement and Save persist coordinates against immutable capability IDs. Move Buttons reopens existing layout without replacing it. AI connection checkboxes perform an actual server call before saving; separate Answer AIs checkboxes choose responders. Cards share one horizontal row and failures are independent. Selected providers persist in room revision. Existing owned Katie room is explicitly selected and linked, never guessed from a new RCV3 ID.

10 focused tests passed including eight simultaneous budget reservations, duplicate reservation rejection, old-state defaults, invalid provider subsets and immutable capability bindings. Full Next build passed. Review fixes: clone settings validated and preserved; late history merges by request ID; edit-existing entry added. Physical microphone remains unverified in the cloud browser (no input device). This revision does not certify all providers or paid tiers.
