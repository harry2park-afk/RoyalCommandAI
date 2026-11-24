# Desktop meeting backgrounds — 2026-09-21

## Work declaration
STANDARD; single writer root; scope new local camera/background preview and one catalog navigation link. Owner approved ten designs and PC-first development. Independent reviewer review_meeting reviewed privacy and lifecycle; three findings fixed, six focused tests independently passed. Production/master, existing room records, billing and telephone integrations untouched.

## Delivered design
Ten ocean-view designs, spacious panoramic rear windows, one shared foreground desk. Two female and one male photorealistic AI characters occupy three seats. Empty seat near 41% frame width reserved for the customer's actual camera feed. All assistants are static artwork, not live attendees or speaking avatars.

Assets: public/room-designs/meeting-ocean-01.webp through meeting-ocean-10.webp. Original images generated and revised with the built-in image generation tool; prompt specification: 16:9 photorealistic spacious ocean-view office, shared desk, three assistant characters, fourth seat empty, centre portrait slot, no text/logos. Ten decor variants: executive, ivory, botanical, blue, library, loft, Zen, glass, emerald, lavender.

## Local preview
/rcv3/meetings is Preview-only and requires the existing account session. Create Room sidebar offers Meeting Rooms navigation for personal and business users; no company account requirement was added. Selection is local to the page. Camera starts only on request; microphone and recording are off. Foreground segmentation uses pinned MediaPipe Selfie Segmentation 0.1.1675465747 (official example: https://chuoling.github.io/mediapipe/solutions/selfie_segmentation.html). SDK/model fetched from jsDelivr after explicit camera action; camera frames are processed locally. No signalling, peer connection, recording or image uploads. Camera stops on cancellation, page hide, navigation and processing failure. First-frame and subsequent processing deadlines are 20 seconds. Model or device failure never exposes raw camera background as a fallback.

## Not implemented / acceptance still required
- No configured conference provider or human-to-human video call implementation was found in current source/dependencies. This page is NOT an operational conference room.
- Real two-party PC call, private invitations, admission/access controls, reconnection and cross-company participant consent require a separately configured conferencing adapter and real end-to-end tests.
- User explicitly requires speech translated to English or each recipient's selected language, with captions and translated audio. Implementation must preserve speaker attribution and order; avoid original/translated audio echo; allow original audio/captions and original-text review; define supported languages and latency from actual service tests. No translated audio is currently sent.
- AI assistants' speech/lip movement is not implemented. Keep AI labels visible if assistants later participate in a transmitted composite.
- Real-person camera segmentation/positioning must be tested on the customer's PC. Unit tests do not prove camera hardware or image quality.
- Mobile work is deferred at the owner's request.

## Verification
Focused lifecycle tests cover explicit camera start/no microphone, cancelled late grant cleanup, denied permission, processing timeout, pending-send shutdown and locale English fallback. Independent review found no remaining blocker for a clearly labelled local preview. Live browser gallery/camera checks are reported separately; do not infer remote call success from preview rendering.

## Seat layout revision
STANDARD: single writer, independent review_meeting reviewer. Replaced seven gallery entries with two solo, two duo, two trio and one six-seat wide table. Retained original ocean01/05/09 artwork with three AI characters and one real-camera slot. New versioned assets preserve originals. My Seat selects local compositing position and resets to first seat when changing designs. Narrow seats scale the camera image before clipping. Solo desk masks calibrated to generated artwork.
Camera lifecycle tests pass; actual physical-camera appearance remains unverified. This does not implement remote conferencing, unlimited capacity, microphone transmission or translation. No configured conferencing service was available in this implementation; connecting a real multi-user session remains outstanding.

Owner color correction: mix colors, do not standardize all brown. Final gallery uses ivory solo, cognac brown garden solo and library duo, and green remaining layouts. Brown variants not selected are not published.
