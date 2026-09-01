# Professional Room Phase 1 — Capability / Safety / Default ON-OFF Matrix

Date: 2026-09-02 Australia/Sydney
Contract: Design Contract v2.3
Status: DESIGN BASELINE — IMPLEMENTATION NOT STARTED

## Global rules

- Legal Vault and Accounting Vault remain separate.
- `bridge_la` coordinates both domains but never merges them.
- High-risk professional judgment is `Candidate -> Human Confirmation`.
- External side effects are DEFAULT DENY.
- Missing/unverified Country Pack or required review => OFF.
- Unverified provider/connector contract => OFF and not Connected.
- Formal ApprovalGrant/DelegationGrant is required where specified; ordinary chat wording is insufficient.
- Every material action must emit evidence appropriate to risk.

## Canonical Legal base rooms (10)

1. `legal_personal` — Personal Legal Room
2. `legal_litigation_dispute` — Litigation & Dispute Room
3. `legal_lawyer_practice` — Lawyer Practice Room
4. `legal_law_firm` — Law Firm Room
5. `legal_corporate_business` — Corporate & Business Legal Room
6. `bridge_la` — Legal + Accounting Practice Room
7. `legal_operations_support` — Legal Operations / Support Room
8. `legal_professional_research` — Professional Legal Research Room
9. `legal_custom` — Custom Legal Room
10. `legal_personal_compliance` — Personal Legal & Compliance Room

## Canonical Accounting base rooms (8)

1. `acct_personal` — Personal Accounting
2. `acct_accountant_practice` — Accountant Practice
3. `acct_accounting_firm` — Accounting Firm
4. `acct_bookkeeping` — Bookkeeping
5. `acct_tax_compliance` — Tax Compliance
6. `acct_corporate_reporting` — Corporate Accounting & Management Reporting
7. `bridge_la` — Legal + Accounting Practice Room
8. `acct_custom` — Custom Accounting

`bridge_la` is one internal Product ID represented in both professional catalogs. Legal and Accounting vault boundaries remain separate.

## Matrix

| Room | Capability | Risk | Vault | Country Pack | Human Confirmation | External Side Effect | Default State | Required Grant | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Personal Legal | document organise / summarise / chronology | LOW | Legal | No for generic handling | No | No | ON | Matter ACL | access + source refs |
| Personal Legal | legal issue analysis / options candidate | HIGH | Legal | Yes when jurisdiction-dependent | Yes | No | CANDIDATE | Matter ACL | prompt/source/model + confirmation |
| Personal Legal | send lawyer/client correspondence | HIGH | Legal | Yes | Yes | Yes | OFF | ApprovalGrant + Delegation if acting for another | gateway + delivery evidence |
| Personal Legal | filing/signing/submission | REGULATED | Legal | Yes | Yes | Yes | OFF | ApprovalGrant + valid authority | filing receipt + policy evidence |
| Litigation & Dispute | evidence bundle / chronology / issue map | MEDIUM | Legal | Context dependent | No | No | ON | Matter ACL | source lineage |
| Litigation & Dispute | strategy / pleadings / settlement candidate | HIGH | Legal | Yes | Yes | No | CANDIDATE | Matter ACL | candidate + reviewer evidence |
| Litigation & Dispute | serve/file/communicate settlement position | REGULATED | Legal | Yes | Yes | Yes | OFF | ApprovalGrant + Delegation | side-effect receipt |
| Litigation & Dispute | deadline/court rule automation | HIGH | Legal | Yes | Yes for action; no for reminders | Maybe | OFF until pack verified | Matter ACL; Approval for action | rule version + timer/action evidence |
| Lawyer Practice | research / drafting / matter prep | MEDIUM | Legal | Yes for substantive law | Professional review | No | ON for draft/research | Matter ACL | citations + provenance |
| Lawyer Practice | final professional advice candidate | HIGH | Legal | Yes | Yes | No | CANDIDATE | professional role + Matter ACL | reviewer identity + finalisation |
| Lawyer Practice | client send / filing / signature request | HIGH | Legal | Yes | Yes | Yes | OFF | ApprovalGrant | connector + receipt |
| Lawyer Practice | delegated staff execution | HIGH | Legal | Yes | Yes where required | Maybe | OFF by default | DelegationGrant + SoD | delegation + policy trace |
| Law Firm | firm knowledge / precedent retrieval | MEDIUM | Legal | Context dependent | No | No | ON | Firm RBAC + Matter ACL | retrieval trace |
| Law Firm | cross-matter access | HIGH | Legal | No | No | No | OFF | explicit Matter ACL | access decision evidence |
| Law Firm | firm-wide workflow / client communication | HIGH | Legal | Yes | Yes as policy requires | Yes | OFF | ApprovalGrant / DelegationGrant | workflow + recipient + receipt |
| Law Firm | trust/client-money instruction | REGULATED | Legal | Yes | Yes | Yes | OFF | dual approval where required + SoD | financial/approval evidence |
| Corporate & Business Legal | contract review / clause extraction | MEDIUM | Legal | Context dependent | No | No | ON | Matter ACL | source refs |
| Corporate & Business Legal | legal position / transaction recommendation | HIGH | Legal | Yes | Yes | No | CANDIDATE | Matter ACL | decision trail |
| Corporate & Business Legal | sign/send/submit corporate instrument | REGULATED | Legal | Yes | Yes | Yes | OFF | ApprovalGrant + Delegation | executed artifact + receipt |
| Corporate & Business Legal | entity/register change instruction | REGULATED | Legal | Yes | Yes | Yes | OFF | formal authority + ApprovalGrant | registry evidence |
| Legal + Accounting Practice (`bridge_la`) | coordinated matter overview | MEDIUM | Virtual view only | Context dependent | No | No | ON only for granted fields | ShareGrant + both source ACLs | cross-domain access trace |
| Legal + Accounting Practice (`bridge_la`) | cross-domain analysis candidate | HIGH | Virtual view only | Yes | Yes | No | CANDIDATE | ShareGrant + Matter ACL | source-domain lineage |
| Legal + Accounting Practice (`bridge_la`) | copy Legal data into Accounting or reverse | HIGH | Separate domains | No | Yes | No | OFF | explicit ShareGrant / permitted derived-copy rule | copy provenance + expiry linkage |
| Legal + Accounting Practice (`bridge_la`) | external filing/payment/message | REGULATED | respective source vault | Yes | Yes | Yes | OFF | ApprovalGrant + Delegation as applicable | gateway evidence |
| Legal Operations / Support | intake / classify / route / checklist | LOW | Legal | No | No | No | ON | tenant/room ACL | routing trace |
| Legal Operations / Support | task assignment / staff delegation | MEDIUM/HIGH | Legal | No | Yes for authority changes | Maybe | OFF for authority changes | DelegationGrant | assignee + scope evidence |
| Legal Operations / Support | bulk client communication | HIGH | Legal | Yes where regulated | Yes | Yes | OFF | ApprovalGrant | recipient set + delivery evidence |
| Legal Operations / Support | delete/close/archive matter | HIGH | Legal | Retention dependent | Yes | Yes/internal mutation | OFF | ApprovalGrant + retention policy | before/after + retention evidence |
| Professional Legal Research | source search / comparison / synthesis | MEDIUM | Legal research scope | Yes for jurisdiction | Professional review | No | ON | role + project ACL | citations/provenance |
| Professional Legal Research | authoritative legal conclusion | HIGH | Legal | Yes | Yes | No | CANDIDATE | professional role | review + source versions |
| Professional Legal Research | publish/distribute research externally | HIGH | Legal | Yes | Yes | Yes | OFF | ApprovalGrant | publication artifact |
| Professional Legal Research | ingest restricted/licensed corpus | HIGH | Legal | License dependent | Yes where required | External connector | OFF until rights verified | data-license grant | license/source evidence |
| Custom Legal | configured low-risk drafting/retrieval | LOW/MEDIUM | Legal | Depends on pack | No unless configured | No | OFF until template approved | Room policy + ACL | config version |
| Custom Legal | configured high-risk legal judgment | HIGH | Legal | Yes | Yes | No | OFF/CANDIDATE after approval | policy approval | candidate + policy evidence |
| Custom Legal | configured side-effect action | HIGH/REGULATED | Legal | Yes | Yes | Yes | OFF | ApprovalGrant + connector permission | gateway evidence |
| Custom Legal | custom connector | HIGH | Legal | Yes | As required | Maybe | OFF | approved ConnectorContract | connector verification |
| Personal Legal & Compliance | obligation/contract/record tracker | LOW/MEDIUM | Legal | Context dependent | No | No | ON | owner ACL | source + schedule evidence |
| Personal Legal & Compliance | compliance risk assessment | HIGH | Legal | Yes | Yes | No | CANDIDATE | owner/matter ACL | rule/source version |
| Personal Legal & Compliance | submit renewal/notice/response | REGULATED | Legal | Yes | Yes | Yes | OFF | ApprovalGrant | submission receipt |
| Personal Legal & Compliance | automated compliance remediation | REGULATED | Legal | Yes | Yes | Yes | OFF | ApprovalGrant + valid connector | before/after evidence |
| Personal Accounting | classify transactions / personal reports | LOW/MEDIUM | Accounting | Tax pack not needed for generic classification | No | No | ON | owner ACL | source refs |
| Personal Accounting | tax/accounting treatment candidate | HIGH | Accounting | Yes | Yes | No | CANDIDATE | owner ACL | rule/source + confirmation |
| Personal Accounting | lodge/pay/transfer | REGULATED | Accounting | Yes | Yes | Yes | OFF | ApprovalGrant | payment/lodgement receipt |
| Personal Accounting | bank/account connector write | HIGH | Accounting | Yes where regulated | Yes | Yes | OFF | ApprovalGrant + ConnectorContract | connector evidence |
| Accountant Practice | bookkeeping/reconciliation/draft workpapers | MEDIUM | Accounting | Context dependent | Professional review by workflow | No | ON | client ACL | workpaper lineage |
| Accountant Practice | final tax/accounting position | HIGH | Accounting | Yes | Yes | No | CANDIDATE | professional role + client ACL | reviewer evidence |
| Accountant Practice | lodge return / send client document | REGULATED | Accounting | Yes | Yes | Yes | OFF | ApprovalGrant + Delegation | lodgement/delivery receipt |
| Accountant Practice | payment/refund instruction | REGULATED | Accounting | Yes | Yes | Yes | OFF | ApprovalGrant + SoD | transaction evidence |
| Accounting Firm | firm workpaper/knowledge retrieval | MEDIUM | Accounting | Context dependent | No | No | ON | firm RBAC + client ACL | retrieval trace |
| Accounting Firm | cross-client access | HIGH | Accounting | No | No | No | OFF | explicit client ACL | access decision evidence |
| Accounting Firm | bulk filing/payment workflow | REGULATED | Accounting | Yes | Yes | Yes | OFF | ApprovalGrant + SoD | batch evidence |
| Accounting Firm | staff delegation / approval authority | HIGH | Accounting | No | Yes | Internal authority mutation | OFF | DelegationGrant | delegation audit |
| Bookkeeping | transaction import/classification/reconciliation | LOW/MEDIUM | Accounting | No for bookkeeping only | No | No | ON | client ACL | source + reconciliation trace |
| Bookkeeping | post journal / alter ledger | MEDIUM/HIGH | Accounting | Policy dependent | Yes for material entries | Internal mutation | OFF by default | ApprovalGrant or configured threshold policy | before/after ledger evidence |
| Bookkeeping | pay supplier / bank transfer | REGULATED | Accounting | Yes | Yes | Yes | OFF | ApprovalGrant + SoD | payment receipt |
| Bookkeeping | close period / lock books | HIGH | Accounting | Policy dependent | Yes | Internal mutation | OFF | ApprovalGrant | period-lock evidence |
| Tax Compliance | tax data organise / workpaper prep | MEDIUM | Accounting | Yes | Professional review | No | ON when pack verified | client ACL | source + pack version |
| Tax Compliance | tax position / return candidate | HIGH | Accounting | Yes | Yes | No | CANDIDATE | professional role | candidate + reviewer evidence |
| Tax Compliance | lodge return / amendment / election | REGULATED | Accounting | Yes | Yes | Yes | OFF | ApprovalGrant + Delegation | authority + receipt |
| Tax Compliance | pay tax / request refund destination | REGULATED | Accounting | Yes | Yes | Yes | OFF | ApprovalGrant + SoD | transaction evidence |
| Corporate Accounting & Management Reporting | management reports / variance analysis | MEDIUM | Accounting | No for generic reporting | No | No | ON | corporate ACL | data lineage |
| Corporate Accounting & Management Reporting | accounting estimate / policy recommendation | HIGH | Accounting | Yes where standards/jurisdiction apply | Yes | No | CANDIDATE | professional role | assumptions + approval |
| Corporate Accounting & Management Reporting | post material adjustment / close period | HIGH | Accounting | Context dependent | Yes | Internal mutation | OFF | ApprovalGrant | before/after evidence |
| Corporate Accounting & Management Reporting | external financial report publication | REGULATED/HIGH | Accounting | Yes | Yes | Yes | OFF | ApprovalGrant | published artifact + approval |
| Custom Accounting | configured low-risk bookkeeping/reporting | LOW/MEDIUM | Accounting | Depends on pack | No unless configured | No | OFF until template approved | Room policy + ACL | config version |
| Custom Accounting | configured tax/accounting judgment | HIGH | Accounting | Yes | Yes | No | OFF/CANDIDATE after approval | professional policy | candidate evidence |
| Custom Accounting | configured payment/lodgement action | REGULATED | Accounting | Yes | Yes | Yes | OFF | ApprovalGrant + SoD | gateway evidence |
| Custom Accounting | custom connector | HIGH | Accounting | Yes as applicable | As required | Maybe | OFF | approved ConnectorContract | connector verification |

## Specialty Pack rule

Specialty Packs add policy/capability overlays to an existing base room; they do not create uncontrolled new base-room types.

Legal examples: Family Law, Migration, Conveyancing / Property, Personal Injury / Compensation, Criminal, Commercial, Contracts, Employment, Wills & Estates, Insolvency, IP / Patent, Insurance, Strata / Property, Legal Research.

Accounting examples: Payroll, SMSF, Audit, Trust Accounting, CFO / Controller, Accounts Payable, Accounts Receivable, Xero, MYOB, QuickBooks.

Every Specialty Pack must declare jurisdiction, capability overrides, default states, required professional review, connector dependencies and evidence requirements. A pack cannot loosen Global Core safety rules.

## Billing Metadata allowlist

Billing Engine may read only the minimum metadata necessary for metering/entitlement/invoice/audit, such as:

- tenant/org ID;
- product/room type ID;
- plan/entitlement ID;
- metered capability ID;
- provider/model/connector billing code;
- units/tokens/duration/count;
- price/rate reference;
- currency;
- timestamp;
- invoice/customer billing reference;
- success/failure/refund status required for charging.

Billing Engine must not read document body, legal advice, accounting workpaper contents, prompt body, matter narrative, privileged communication, bank statement body or other vault payload merely to calculate charges.

## Phase 1 matrix gate

PASS requires:

- all 18 catalog entries present;
- `bridge_la` represented once internally and in both catalogs;
- every high-risk judgment Candidate-only until Human Confirmation;
- every external side effect DEFAULT OFF/DENY;
- every regulated capability dependent on verified Country Pack/review;
- every connector-dependent action OFF until ConnectorContract is verified;
- all cross-vault access requires ShareGrant Virtual View;
- no Billing Engine broad vault read;
- no Room-specific bypass of the Unified Authority / Policy Engine.
