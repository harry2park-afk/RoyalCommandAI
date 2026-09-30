# Create Room secretary setup

STANDARD. Root sole writer; katie_review independent read-only reviewer.
Owner authorized adding customer email/phone questions to the existing form.
Preview only; baseline 4322002f06c314e6f4a38be8938e7ce5f6522f02.

Selecting AI Secretary reveals email and international phone fields. They start
empty, follow the account-owned draft save/resume path, and appear in Review.
Next validates contacts; unfinished input may still be saved as a draft.
Deselecting the secretary clears contacts from the current revision (older
insert-only revisions are retained). Existing drafts get empty safe defaults.
Strict setup fields cannot contain tokens, verified flags or runtime bindings.

16 relevant tests passed; production build passed; reviewer approved draft-only
Preview verification. Existing paid/free activation gates remain unchanged.
The current wizard still saves drafts rather than activating service instances.
These fields therefore capture setup intent, NOT verified email access or phone
provisioning. Customer OAuth/number verification and the activation handoff remain
required before claiming a working customer installation.
