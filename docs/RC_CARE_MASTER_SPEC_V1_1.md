# Royal Command Care Master Spec v1.1

Status: OFFICIAL ARCHITECTURE SPECIFICATION
Authority: Subordinate to `ROYAL_COMMAND_LAW.md`
Scope: Royal Command Global Core, all country editions, healthcare/care accessibility features, hospital/site integrations

## 1. Governing Principle

RC Care is a Royal Command Global Core capability. It must not be implemented as separate country-specific application forks. Country differences are implemented through Country Pack / Policy / Configuration / Locale Overlay / Site Config.

RC Care remains subordinate to `ROYAL_COMMAND_LAW.md`, including One Global Core, Provider Neutrality, HIGH-RISK / REGULATED execution rules, Single Write Authority, Evidence Before SUCCESS, least privilege, tenant/data isolation, Host Executor, rollback, and owner approval policy.

## 2. Product Goal

RC Care enables users who are bedridden, elderly, disabled, temporarily injured, recovering after surgery, or otherwise unable to use their hands normally to use Royal Command through voice-first and accessible interaction.

Primary experience:
- The RC interface may present text and speak prompts aloud.
- The user may respond by voice only.
- The user should not be required to manipulate complex forms.
- RC may assist with communication, reading, news, images, maps, media, translation, reminders, AI interaction, and approved external actions.

## 3. Core Capability Layers

RC Care Core supports interchangeable input and assistive adapters:
- Voice Input
- Voice Command
- Voice Authentication
- Touch
- Eye / Gaze Tracking
- Face Tracking
- Assistive Switch Input
- Assistive Display Orientation / Motorised Tablet Dock
- Future BCI / Neural Interface Adapter

All input methods normalize into `PatientIntent`. No input modality may bypass authentication, policy, safety, confirmation, execution gateway, or audit controls.

## 4. Voice Command vs Voice Authentication

Voice Command and Voice Authentication are separate runtime security domains.

Voice Command:
- Controls navigation and permitted user actions.
- Does not itself establish identity for high-risk actions.

Voice Authentication:
- Must use liveness / anti-replay / synthetic-voice detection and randomized challenge-response where technically appropriate.
- Voice biometrics may be an active authentication factor.
- Voice biometrics MUST NOT be the sole factor for high-risk actions such as account recovery, payments, security changes, clinical instruction changes, or privileged external execution.
- Users with impaired speech, dysarthria, illness-related voice changes, or reduced vocal ability must have accessible fallback authentication.

## 5. Emergency Recovery

Emergency Recovery exists for loss of normal trusted devices such as a laptop and tablet.

A pre-registered mobile device may act as an Emergency Recovery Device.

Recovery must require multiple independent factors, including:
- strong device / passkey verification or equivalent pre-registered strong factor;
- Recovery Secret / PIN / password;
- Voice Authentication with liveness as an additional factor where usable.

Recovery controls:
- rate limits and brute-force protection;
- anomaly detection;
- cooldown / delay for suspicious attempts;
- user-visible recovery event notification;
- tamper-resistant audit logging;
- immediate revocation of lost devices and associated live sessions/tokens after confirmed recovery;
- no silent password-only bypass when all trusted devices are lost.

## 6. Doctor / Nurse Instruction Model

Clinical instructions must be structured and machine-actionable. Free text may accompany structured fields but may not be the sole source of high-risk execution policy.

Minimum instruction fields:
- `order_id`
- `patient_room_id`
- `issuer_role`
- `issuer_id`
- `issued_at`
- `effective_at`
- `expires_at` or `review_by`
- `priority`
- `severity`
- `machine_action` = `allow | block | escalate`
- `human_text`
- `version`
- `supersedes`
- `acknowledgement`
- `revocation`
- `audit_id`

The system must define deterministic handling of expiration, supersession, conflicts, duplicates, and stale instructions.

## 7. Clinical Policy Gate — P0 Mandatory

All clinical or care-sensitive side effects must pass through a single controlled Clinical Execution Gateway.

Default rule:
- clinical/safety-sensitive action = DENY unless explicitly allowed by valid policy and context;
- unknown, stale, conflicting, unavailable, or unverifiable policy = BLOCK + ESCALATE;
- high-risk Care actions are OFF in any country/site without an approved compliance/configuration pack.

Examples of restricted actions include:
- food / drink ordering or delivery;
- medication-related actions;
- egress / mobility actions;
- payments / purchases;
- changing clinical instructions;
- high-risk external communication or device control.

Example:
If the patient is NPO / fasting, RC must not order food or drink. It may explain the restriction and offer to contact a nurse.

## 8. AI Clinical Boundary — P0 Mandatory

RC Care AI must not independently:
- diagnose;
- prescribe;
- administer medication;
- change medication;
- generate autonomous treatment orders;
- perform autonomous emergency severity decisions that substitute for clinicians;
- override valid clinical restrictions.

AI may:
- understand requests;
- retrieve and explain applicable instructions;
- present non-clinical information;
- assist communication;
- route or escalate to a nurse / clinician;
- perform companion and accessibility functions.

When a user reports symptoms or distress, RC may record the request and escalate, but clinical judgment remains with qualified humans unless a separately approved regulated capability explicitly permits otherwise.

## 9. Nurse Call Connector — P0 Mandatory

Nurse Call must not be fire-and-forget.

Required delivery states:
- `accepted`
- `delivered`
- `attendant_ack`
- `failed`
- `degraded`

Required behavior:
- timeout;
- retry;
- alternate channel escalation;
- user-facing spoken delivery status;
- local fallback when primary network integration is unavailable.

Possible connector adapters may include hospital APIs, SIP/PBX, local webhook, MQTT, app/push terminal, physical relay, Bluetooth, cellular backup, or other site-approved interfaces.

Life-safety help requests must degrade toward human escalation, not silently disappear.

## 10. Degraded / Offline Modes — P0 Mandatory

RC Care must explicitly expose operational state:
- Normal
- Degraded
- Unavailable
- Fallback Active

Rules:
- restricted clinical actions remain fail-closed when policy state cannot be trusted;
- help-request / nurse escalation paths must fail toward a human-accessible fallback where possible;
- the UI must not present an unavailable connector as healthy;
- signed, time-limited last-known-valid policy cache may be used only under explicitly approved rules; otherwise block and escalate.

## 11. Health / Clinical Data Vault — P0 Mandatory

Clinical instructions, patient symptoms, NPO state, care restrictions, nurse-call logs, and other health-related data must be segregated from ordinary Room conversation memory.

Use a dedicated encrypted Clinical / Health Data Vault with:
- encryption in transit and at rest;
- least-privilege access;
- explicit role separation;
- tenant / organisation / patient / room isolation;
- purpose limitation and data minimization;
- configurable retention;
- audit trails;
- breach detection / security monitoring;
- model-training exclusion by default for protected clinical data;
- country/site data-residency rules where required.

Roles must distinguish at minimum:
- Patient
- Doctor
- Nurse / Clinical Staff
- Family / Carer
- Administrator

Family / Carer access to clinical data is denied by default unless explicitly granted under policy.

## 12. Patient Voice Conversation

The patient-facing Care interface should be conversational and accessible.

Preferred interaction:
- RC displays text and speaks the prompt;
- the patient answers by voice only if desired;
- RC confirms ambiguous or consequential requests;
- RC avoids requiring form entry from the patient.

Examples:
- “I want some water.”
- “I need to go to the toilet.”
- “Please call the nurse.”
- “Read my book.”
- “Call my family.”
- “Show me Korea.”
- “Continue the news.”

Clinical restrictions are applied by the policy layer before any side-effect action.

## 13. Accessibility and Bed Mode

RC Care includes an accessibility framework with:
- hands-free navigation;
- voice-first interaction;
- large text;
- high contrast;
- simplified screens;
- optional reduced-motion / reduced-complexity modes;
- screen reading;
- speech output;
- multimodal fallback for users whose voice, vision, or motor control changes over time.

Accessibility behavior must not weaken authentication or clinical safety controls.

## 14. Assistive Display Orientation / Face-Tracking Dock

RC Care may support a motorised tablet dock that keeps the display/camera oriented toward the user.

Core must define this as a provider-neutral capability such as `AssistiveDisplayOrientation`, not hard-code a specific hardware vendor.

Safety requirements include:
- bounded movement range;
- speed limits;
- manual stop;
- collision / obstruction handling;
- no uncontrolled continuous movement;
- privacy-preserving local processing preferred for camera/face-position data;
- safe fallback to stationary mode on tracking uncertainty.

The dock is an optional accessory capability, not a prerequisite for RC Care Core.

## 15. Future BCI / Neural Interface

RC Care must remain compatible with future Brain–Computer Interface systems, including but not limited to Neuralink.

No BCI vendor may become a mandatory dependency.

Define a provider-neutral BCI Adapter contract for:
- normalized intent events;
- confidence score;
- device / provider identity;
- signal health;
- calibration state;
- error / degraded state;
- replay / spoof resistance where applicable.

BCI input passes through the same `PatientIntent → Authentication / Confirmation → Clinical Policy Gate → Execution Gateway → Audit` pipeline as voice, gaze, touch, or switch input.

Production BCI integration is not required for the initial MVP.

## 16. RC Master / Country Pack / Site Config Boundary

RC Master Core owns:
- intent normalization;
- auth factor framework;
- Voice Command / Voice Authentication separation;
- risk tier / step-up auth policy;
- Clinical Policy Engine runtime;
- Clinical Execution Gateway;
- Health/Clinical Vault architecture;
- audit framework;
- Nurse Call Connector interface;
- degraded-state framework;
- accessibility framework;
- BCI / assistive adapter interfaces.

Country Pack owns country-specific:
- language / locale;
- emergency numbers;
- privacy / health-data requirements;
- consent / notice text;
- retention / residency constraints;
- country-level medical / device / communications restrictions;
- approved provider / connector restrictions.

Hospital Site Config owns:
- nurse-call endpoint and routing;
- ward / room mapping;
- staff roster integration;
- site-specific escalation path;
- local hardware / relay configuration;
- site clinical workflow mapping.

Country Pack or Site Config may narrow permissions but may not weaken RC Core P0 safety controls without an explicitly approved HIGH-RISK change.

## 17. Vendor Neutrality

Voice authentication, STT/TTS, Nurse Call, face/gaze tracking, motorised docks, BCI, messaging, and other integrations must use replaceable Provider Registry / Adapter / Connector interfaces wherever practical.

No single vendor may become an unreviewed mandatory dependency for RC Care.

## 18. Regulatory Status

RC Care is a HIGH-RISK / REGULATED domain under `ROYAL_COMMAND_LAW.md`.

Before production launch in a country/site, applicable legal, privacy, health-data, medical-device / clinical decision-support, communications, consent, and hospital integration requirements require formal review.

Architecture documents must not claim regulatory approval merely because software controls exist.

Status label for unresolved regulated scope:
`LEGAL/REGULATORY REVIEW REQUIRED`

## 19. MVP Boundary

Initial MVP should prioritize:
- Bed / Hands-Free Mode;
- Voice Command;
- separated Voice Authentication;
- accessible UI;
- structured Doctor/Nurse Instruction model;
- Clinical Policy Gate;
- Nurse Call Connector with at least one reliable fallback path;
- companion / reading / communication features;
- Clinical Data Vault architecture;
- audit and degraded-state visibility.

Defer or limit initially:
- production BCI integration;
- universal native integration with every hospital system;
- autonomous clinical decision-making;
- 100-country simultaneous Care launch;
- highly automated multimodal surveillance;
- vendor-specific motorised dock dependency.

## 20. Verification and Release Gate

No RC Care production release may be declared successful without Host-verifiable evidence appropriate to a HIGH-RISK / REGULATED feature.

Minimum verification categories:
- auth / step-up security tests;
- Voice Command / Voice Authentication separation tests;
- policy fail-closed tests;
- instruction conflict / expiry tests;
- nurse-call ack / timeout / retry / fallback tests;
- degraded/offline tests;
- vault access-control / tenant-isolation tests;
- audit-log verification;
- lost-device / recovery / revoke tests;
- accessibility tests;
- country/site policy tests;
- rollback evidence;
- post-deploy runtime/error monitoring.

## 21. Architecture Review Record

Independent AI review result for the pre-v1.1 concept:
- ChatGPT: PASS WITH CONDITIONS
- Codex: PASS WITH CONDITIONS
- Gemini: PASS WITH CONDITIONS
- Grok: PASS WITH CONDITIONS

v1.1 incorporates the common P0 findings from those reviews, including:
- default-deny clinical side effects;
- fail-closed Clinical Policy Gate;
- acknowledged Nurse Call delivery with fallback;
- structured clinical instruction model;
- Voice Command / Voice Authentication separation;
- high-risk voice-only prohibition;
- stronger Emergency Recovery;
- dedicated Clinical / Health Data Vault;
- AI clinical action boundary;
- explicit degraded modes;
- RC Master / Country Pack / Site Config responsibility boundary;
- provider-neutral BCI and hardware adapters;
- legal/regulatory review requirement.

## 22. Change Control

Any future RC Care idea that materially improves accessibility, safety, clinical integration, recovery, or future interface capability should not remain only in conversation history.

Process:
1. capture idea;
2. classify risk;
3. add or revise official specification;
4. independent review for STANDARD/HIGH-RISK changes;
5. implementation ticket;
6. controlled code change;
7. tests/evidence;
8. deployment under `ROYAL_COMMAND_LAW.md`.

Conversation history is not the authoritative specification. GitHub repository governance/spec documents are the source of truth.
