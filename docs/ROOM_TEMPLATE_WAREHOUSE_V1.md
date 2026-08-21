# Royal Command Room Template + Warehouse V1

## Product rule

Room = Common Core + Template + selected Materials + Customer Data + Approval + Preview/Test.

Royal Command supplies reusable materials and safe templates. Customers assemble Rooms. AI recommends and validates the assembly.

## Common Core

Every Room starts with:

1. Data Isolation Boundary
2. Room Identity
3. Conversation History
4. Primary AI
5. Room Memory
6. Owner Permission
7. Human Approval Gate
8. Preview & Test

Conversation History and AI Memory are separate controls.

## Customer flow

1. Choose Room purpose/template.
2. Name the Room and answer only the minimum template questions.
3. Royal Command automatically selects a recommended AI/Tool/Memory package.
4. Customer removes or adds optional Warehouse materials.
5. Customer chooses Safe / Approval / Autonomous mode.
6. Customer optionally enables Website Builder Kit.
7. Preview/Test the configuration.
8. Approve & Create.
9. The created Room appears as a strong real Room button in Command Room.

## Warehouse categories

- Core
- AI
- Tool
- Memory
- Knowledge/Documents
- Permission
- Approval
- Connection
- Website
- Automation
- UI/Test

## First template presets

### Legal
Document Reader, Web Search, Email Draft, Email Send, E-signature, Supporting AI, Staff Permission, External Send Approval.

### Accounting
Document Reader, Spreadsheet, Email Draft, Staff Permission, External Send Approval.

### Business / Customer Support base
Document Reader, Email Draft, Calendar, CRM, Supporting AI, Staff Permission.

### Technology / Development
Document Reader, Web Search, GitHub, Vercel, Database Read, Supporting AI, Delete Approval.

### Education / Learning
Document Reader, Web Search, Calendar, Viewer Permission.

## Safety rules

- Customer data must not cross Room/customer boundaries.
- High-risk materials remain approval-gated by default.
- API keys and secrets are not exposed in customer UI.
- OAuth/customer connections are represented as simple connection states in Builder.
- Destructive actions require explicit policy and approval.
- Preview/Test happens before activation.

## Website Builder Kit

Optional Warehouse material for AI-assisted website structure, pages, forms, Room links, responsive layout, preview and deployment preparation. Production publish remains permission/approval controlled.

## V1 goal

Prove the system with Legal Room first, then reuse the same Core and Warehouse for Accounting, Customer Support, Technology/Development and Learning without building separate Room codebases.
