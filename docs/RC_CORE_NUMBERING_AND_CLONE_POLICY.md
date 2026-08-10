# Royal Command Core Numbering & Clone Policy

Status: Active architecture rule
Owner: Royal Command

## 1. Core principle
Anything Royal Command successfully builds once should be designed for safe reuse. Do not rebuild the same approved capability from zero for each customer.

The system is divided into:
- Royal Command Core: reusable Royal Command-owned modules;
- Customer Configuration: customer names, rules, permissions, languages, phone numbers, email accounts, workflows and integrations;
- Customer Data: customer-owned operational data and uploaded documents.

## 2. Module numbering
Every reusable core capability receives a permanent ID in the format `RC-CORE-###` and a semantic version such as `1.0.0`.

Initial registry:
- RC-CORE-001 — Identity, Login & Security Gate
- RC-CORE-002 — Customer Room & Room Builder
- RC-CORE-003 — Company Assistant Roles — Katie, Kevin, Elizabeth
- RC-CORE-004 — Multi-Provider AI Orchestration
- RC-CORE-005 — AI Synthesis & Decision Layer
- RC-CORE-006 — Telephone, Voice & Call Routing
- RC-CORE-007 — Email, Documents & File Intake
- RC-CORE-008 — Work Orders, Records & Reporting
- RC-CORE-009 — Persistent Customer Build Form
- RC-CORE-010 — Customer Clone, Deployment & Upgrade Manager

The executable registry is maintained in `src/lib/core/registry.ts`.

## 3. Existing-code migration rule
Do not rename working files merely to add module numbers. Renaming can break imports, routes and deployments.

Instead:
1. Map existing files to an RC-CORE number in the registry.
2. Keep current working paths unless a technical reason requires refactoring.
3. Add new code under the correct module responsibility.
4. When an existing file is safely refactored, separate reusable core logic from customer-specific configuration.
5. Record version changes in the registry when behaviour materially changes.

## 4. Copy policy
Each module has one copy policy:
- `core-reference`: customers use the Royal Command core service; do not hand out the Royal Command core source merely to create a customer instance.
- `template-copy`: an approved template may be cloned into a customer environment and customised.
- `customer-config`: the core remains shared while the customer's own settings and integrations are stored separately.

## 5. Customer deployment record
Every customer build must record at minimum:
- customer/Room identifier;
- RC-CORE module IDs used;
- module versions used;
- customer-specific configuration version;
- date deployed;
- tests passed;
- exceptions or custom code;
- pending upgrades.

Example:
`ABC Pty Ltd | RC-CORE-002 v1.0.0 | RC-CORE-003 v1.0.0 | RC-CORE-006 v0.5.0 | Customer Config v3 | Tested 2026-08-11`

## 6. Upgrade rule
A customer upgrade should target the affected module number rather than replacing the whole customer system.

Example: if telephone routing changes, upgrade RC-CORE-006 and the customer's telephone configuration. Do not rebuild RC-CORE-001 through RC-CORE-010.

## 7. Customer-specific code rule
Customer-specific code must not be mixed into Royal Command Core when it is unique to one customer. Put it behind configuration, adapters or a customer-specific layer wherever practical.

If a customer improvement is broadly useful, review it, generalise it, test it and then promote it into a new Royal Command Core version.

## 8. Protection rule
Royal Command Core remains Royal Command intellectual property unless a signed enterprise agreement explicitly says otherwise. Customer data and customer-created business information remain distinguishable from Royal Command Core.

## 9. Current migration priorities
Priority order for existing code review:
1. RC-CORE-006 Telephone/Voice — complete the first operational path.
2. RC-CORE-003 Company Assistants — correct role separation and collaboration.
3. RC-CORE-008 Work Orders/Records/Reporting — make phone orders actionable and traceable.
4. RC-CORE-009 Customer Build Form — persistent numbered request/response workflow.
5. RC-CORE-010 Clone/Deployment Manager — automate repeat customer deployment after the first reference implementation is proven.

## 10. Safety rule for refactoring
Do not perform bulk renames or broad rewrites simply for tidiness. Existing production behaviour must be preserved. Refactor in small tested modules and keep rollback possible through Git history.
