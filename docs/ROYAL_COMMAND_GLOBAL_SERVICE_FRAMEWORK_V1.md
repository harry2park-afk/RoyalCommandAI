# Royal Command Global Service Framework V1

## Purpose
Royal Command uses one Global Core for all countries. Country-specific differences are configuration and commercial/regulatory overlays, not separate product forks.

## 1. Global Core
The same Core supports Rooms, AI, files, communications, Cloud Phone, professional collaboration, accounting/legal integrations, media, music, sports, travel/booking, marketplace safety, payments, notifications and future categories.

## 2. Country Packs
Country Packs contain only what varies by jurisdiction or market, including currency, tax, telecom, recording/privacy rules, payment methods, local providers, service availability, language defaults and regulatory flags.

Country and language are independent. A US customer may use Korean; an Australian customer may use Chinese.

## 3. Royal Command First customer experience
Customer workflow priority:
1. RC Embedded: supplier capability operates inside the Royal Command Room.
2. RC Managed: supplier or customer-owned account exists, but RC configures and operates the connection for the customer.
3. External Fallback: customer must use an external supplier surface only when RC cannot safely, lawfully or technically provide the workflow inside RC.

A supplier may be replaced behind the scenes without changing the customer-facing Room workflow.

## 4. Commercial priority
Where supplier agreements permit it, prefer:
1. Wholesale
2. RC resale
3. Supplier commission
4. Referral
5. Customer direct account
6. Custom quote

The objective is sustainable mutual benefit: a competitive customer price plus a sustainable RC margin. No discount, margin or commission is assumed until verified in supplier terms.

Supplier cost, margin, commission and internal commercial notes are server-side data and must not be exposed in customer APIs.

## 5. Customer identity
Where a service legally or commercially requires the customer to own the number/account/license, keep ownership in the customer's name while RC manages the integration where possible. Customer-owned does not mean customer must leave RC to operate it.

## 6. Provider registry
Every external provider is registered once and may have separate country offers. Each offer may specify:
- country
- commercial model
- ownership model
- customer price
- currency
- API availability
- OAuth availability
- RC delivery surface
- review/approval state
- provider priority and fit
- active/blocked state

The Resolver chooses a country-appropriate approved provider, preferring RC-embedded and RC-managed delivery.

## 7. Build versus connect
Do not duplicate a mature external service by default. First evaluate whether RC can integrate it safely through an official API, OAuth, approved partner program, reseller arrangement or supported managed workflow.

Build RC-native functionality when:
- no suitable supplier exists;
- supplier dependence creates unacceptable strategic risk;
- the capability is core RC intellectual property or customer experience;
- integration cannot meet security, compliance, reliability or commercial requirements.

## 8. Room creation catalog
Room creation uses category-first discovery so hundreds of services do not overwhelm customers. The structure is category -> subcategory -> capability/provider option.

Current expandable domains include AI, secretary, communications, accounting, legal, professional services, files, education, business, website, media/video, music, sports, travel/booking and marketplace.

The catalog is also customer education: customers choose what they want to achieve, while RC decides which provider or internal capability should deliver it.

## 9. Music
Music Rooms can support licensed/user-provided sheet music, score-follow cursor/bar, instrument practice, tempo, transposition where supported, loops, metronome, backing tracks, karaoke, timed lyrics where licensed, recording, playback and AI-assisted practice feedback.

External sheet-music, karaoke, lesson, music-generation, analysis and distribution services should be integrated through RC where supplier terms permit. Copyright and licensing rules apply by content and country.

## 10. Media/video
Customers choose outcomes such as AI video, avatar presenter, dubbing/translation, Shorts/Reels, music creation and YouTube publishing preparation. Providers operate behind RC where possible. Direct publishing requires authorized platform integration.

## 11. Sports
Sports use the same expandable structure. Golf, football/soccer, table tennis, badminton and future sports can add training, coaching, video analysis, booking, competition and progress workflows without changing Core.

## 12. Travel, reservations and tickets
RC can search/compare and prepare booking workflows using supported providers. Paid bookings require explicit customer approval before commitment. Travel-agency partner offers must be disclosed when sponsored or commission-bearing and should not suppress independent suitable options.

## 13. Marketplace
The used-goods marketplace is primarily a listing/discovery/acquisition service. Unless a future regulated product explicitly changes the model, RC is not the buyer, seller, escrow provider, shipper or product guarantor.

Safety requirements include seller verification, urgent reporting, rapid temporary restrictions, repeat-abuse controls, evidence preservation, moderation/takedown, and controlled lawful disclosure. Private phone/email data is not handed to another party merely because a dispute is reported.

## 14. Global deployment rule
Never create a separate code fork for each country. The required pattern is:

Global Core + Country Pack + Country Provider Terms + Country Regulatory Controls.

New countries should be launched by adding/verifying the Country Pack and provider terms, then passing QA/security/compliance launch gates.

## 15. Evidence and release discipline
No SUCCESS without evidence. Major service changes must preserve existing Room IDs, customer data, memory/history and stable UI contracts. QA/security checks occur during development and again before release.
