# Royal Command Global Service Framework V1

## Purpose
Royal Command uses one Global Core for all countries. Country-specific differences are configuration and commercial/regulatory overlays, not separate product forks.

## 1. Global Core
The same Core supports Rooms, AI, files, communications, Cloud Phone, professional collaboration, accounting/legal integrations, media, music, sports, travel/booking, marketplace safety, payments, notifications and future categories.

## 2. Country Packs
Country Packs contain only what varies by jurisdiction or market, including currency, tax, telecom, recording/privacy rules, payment methods, local providers, service availability, language defaults and regulatory flags.

Country and language are independent.

## 3. Customer experience
Customers choose only the capability or result they want. Royal Command chooses and manages the supplier connection behind the scenes. Supplier identity and internal connection method are not customer choices.

If Royal Command cannot provide a suitable managed connection, a customer-direct supplier option may be proposed separately at that time. It is not part of the normal Room selection flow.

## 4. Commercial priority
Where supplier agreements permit it, Royal Command should negotiate the best practical arrangement, including wholesale, resale, commission or referral structures. The objective is a competitive customer price and a sustainable RC margin.

No discount, margin, commission or capability is assumed until verified with the supplier. Supplier cost, RC margin, commission and internal commercial notes remain server-side and are not exposed to customers.

## 5. Customer identity
Where a service legally or commercially requires the customer to own the number, account or licence, ownership may remain in the customer's name while Royal Command handles the setup and connection where permitted.

## 6. Provider registry
External providers are registered internally and may have separate country offers. Internal records may include country, commercial model, ownership requirements, customer price, currency, API/OAuth availability, review state, provider priority and active/blocked status.

Royal Command selects the appropriate provider internally. Customers do not choose providers in the normal Room flow.

## 7. Build versus connect
Do not duplicate a mature external service by default. First evaluate whether Royal Command can integrate it through an official API, OAuth, approved partner program, reseller arrangement or supported workflow.

Build RC-native functionality when no suitable supplier exists, supplier dependence creates unacceptable strategic risk, the capability is core RC intellectual property/customer experience, or integration cannot meet security, compliance, reliability or commercial requirements.

## 8. Room creation catalog
Room creation uses category-first discovery so hundreds of services do not overwhelm customers. The structure is category -> subcategory -> capability.

Current expandable domains include AI, secretary, communications, accounting, legal, professional services, files, education, business, website, media/video, music, sports, travel/booking and marketplace.

Customers choose what they want to achieve; Royal Command decides internally how to provide it.

## 9. Music
Music Rooms can support licensed/user-provided sheet music, score-follow cursor/bar, instrument practice, tempo, transposition where supported, loops, metronome, backing tracks, karaoke, timed lyrics where licensed, recording, playback and AI-assisted practice feedback.

External sheet-music, karaoke, lesson, music-generation, analysis and distribution services should be integrated through Royal Command where supplier terms permit.

## 10. Media/video
Customers choose outcomes such as AI video, avatar presenter, dubbing/translation, Shorts/Reels, music creation and YouTube publishing preparation. Provider selection remains an internal Royal Command function.

## 11. Sports
Golf, football/soccer, table tennis, badminton and future sports can add training, coaching, video analysis, booking, competition and progress workflows without changing Core.

## 12. Travel, reservations and tickets
Royal Command can search, compare and prepare booking workflows using supported providers. Paid bookings require explicit customer approval before commitment.

## 13. Marketplace
The used-goods marketplace is primarily a listing/discovery/acquisition service. Unless a future regulated product explicitly changes the model, RC is not the buyer, seller, escrow provider, shipper or product guarantor.

Safety requirements include seller verification, urgent reporting, rapid temporary restrictions, repeat-abuse controls, evidence preservation, moderation/takedown and controlled lawful disclosure.

## 14. Global deployment rule
Never create a separate code fork for each country. Use:

Global Core + Country Pack + Country Provider Terms + Country Regulatory Controls.

New countries are launched by adding/verifying the Country Pack and provider terms, then passing QA/security/compliance launch gates.

## 15. Evidence and release discipline
No SUCCESS without evidence. Major service changes must preserve existing Room IDs, customer data, memory/history and stable UI contracts. QA/security checks occur during development and again before release.
