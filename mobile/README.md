# Royal Command Mobile App — Development Checkpoint

Status: **Saved for future step-by-step development**

This folder is intentionally isolated from the existing Royal Command web application. Nothing here is wired into the current web UI, routes, Vercel production app, or customer Command Room.

## Approved product rule

The first mobile screen is a **non-member / first-time customer Room Discovery screen**.

- A first-time or non-member customer sees the Room Discovery screen.
- The customer may tap any Room they are interested in.
- Tapping a Room will eventually open that Room's dedicated **preview** experience.
- From the preview, the customer can learn about the Room and choose whether to sign up/use it.
- An authenticated/registered Royal Command customer must **not** see this discovery screen after login.
- Existing members will go directly to their own Royal Command customer environment / rooms.
- Preview screens must use sample/demo information only and must never expose another customer's private Room or data.

## Current checkpoint

`design/room-select-prototype.html` preserves the approved Room Select concept supplied on 20 Aug 2026.

The prototype currently contains Room categories including:

- Business: Command, Accounting, Legal, Contract, Secretary, HR, Marketing, Analysis, Video Meeting
- Customer & Assets: Customer Service, Property Management, Architecture, Vehicle Diagnosis, Shopping, Travel, Investment
- Life & Health: Health, Medical, Cooking, Fashion, Exercise, Translation, Royal Chat
- Learning & Hobbies: Education, Music, Hobbies
- Custom Room creation entry

## Future development order

1. Mobile app shell
2. Authentication/member-state routing
3. Non-member Room Discovery screen
4. Room preview template
5. Connect each Room preview one at a time
6. Signup/login handoff
7. Member direct-entry routing
8. Camera, file upload, microphone/voice, notifications
9. Android/iOS device testing
10. Store release preparation

## Important

Do **not** duplicate the Royal Command AI backend or Global Core inside the mobile app. The future mobile application should reuse the Royal Command Global Core/API and provide the mobile-specific navigation and presentation layer.

No Expo/React Native dependency has been added at this checkpoint. That decision is deliberately deferred until mobile implementation starts.