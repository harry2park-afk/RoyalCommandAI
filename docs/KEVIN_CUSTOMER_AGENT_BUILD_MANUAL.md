# Royal Command — Kevin Customer Integrated Agent Build Manual

Status: Internal operating manual
Owner: Royal Command
Primary operator: Kevin

## Purpose
Royal Command does not rebuild every customer system from zero. Kevin must start from the approved Royal Command core architecture, copy the proven base structure into the customer Room, and customise only the parts that differ for that customer.

The customer is not expected to understand AI architecture or complete a very long form in one sitting. The customer explains their own business, work, rules and needs. Kevin converts that information into the Royal Command integrated-agent structure.

## Customer Room Build Form — continuous form model
The customer Room must contain a persistent Customer Build Form. It is not a one-time application form.

The customer may add information:
- when first creating the Room;
- later when they have time;
- whenever they find documents, policies or examples;
- whenever their business process changes;
- whenever Kevin asks for missing information.

The customer may provide information by typing, voice, uploaded documents or approved connected data sources.

The form must preserve earlier answers and allow additions and corrections without forcing the customer to start again.

## Customer Build Form — numbered working format
Every form item must have a permanent item number and a short title so both the customer and Kevin can immediately see what has been requested, answered, completed or still waiting.

Example:
- 001 — Company purpose
- 002 — Services provided
- 003 — Staff and departments
- 004 — Tasks for AI agents
- 005 — Approval rules

Numbering must remain stable. Kevin must not renumber old items when new questions are added. New follow-up questions receive the next available number or a clearly linked sub-number such as 005.1.

### Colour/status rule
The form must distinguish who is waiting on whom:
- RED — Royal Command/Kevin has asked for information and the customer has not yet answered.
- BLUE — Customer has supplied an answer, voice response, file or other material and it is waiting for Kevin review.
- GOLD — Kevin has reviewed the response and the item is accepted/complete.
- GREY — Not required for this customer's selected build level or intentionally deferred.

Colour is a visual aid only. Each item must also show a written status label so accessibility does not depend on colour alone.

### Customer response methods
For every applicable item, the customer should be able to respond using one or more of these methods:
1. Type directly into the Room form.
2. Speak the answer using a microphone; speech is converted to text and remains editable before submission.
3. Upload files such as PDF, Word, image, spreadsheet or other approved document types.
4. Add or forward relevant email material into the Room through an approved email intake method.
5. Add further information later without losing the earlier answer.

The customer must not be forced to complete the whole form at once.

### Document handling rule
Documents are evidence/supporting material for a numbered item. Each uploaded or emailed document should be linked to the relevant form item number whenever possible.

Kevin must record:
- source filename or email subject;
- date received;
- linked form item number;
- whether reviewed;
- whether further information is required.

Kevin must not silently treat an uploaded document as complete acceptance. He must review it and change the item status accordingly.

### Kevin follow-up rule
When a customer answer is incomplete, Kevin does not replace the original question. He adds a concise follow-up under the same number or as a sub-number.

Example:
- 012 — Telephone workflow — BLUE: customer answered.
- 012.1 — Which calls require immediate transfer? — RED: waiting for customer.

This lets the customer see exactly how far the build has progressed and prevents repeated questioning.

### Progress rule
The Room should show simple progress information such as:
- total required items;
- answered items;
- waiting for customer;
- waiting for Kevin review;
- completed items.

Progress is informational only. Kevin may begin safe parts of the build before the whole form is complete.

## Kevin operating loop
1. Read all new information added to the Customer Build Form.
2. Compare it with the existing Royal Command core architecture and the current customer build.
3. Identify what can be reused unchanged and what must be customised.
4. Identify missing, conflicting or unclear information.
5. Add only the necessary follow-up items back into the customer's Build Form.
6. Do not overwhelm the customer with unnecessary questions. Ask in small, relevant groups.
7. When enough information exists, configure or prepare the relevant part of the customer's integrated-agent system.
8. Test the new or changed function before marking it complete.
9. Record what was changed, why it was changed, what was tested, and any remaining issue.
10. Continue the cycle until the agreed build level is complete.

## Information categories Kevin should collect as needed
Kevin may request only categories relevant to the customer's selected build level and actual business:
- company purpose and services;
- departments and staff roles;
- tasks to delegate to AI;
- agent roles and number of agents;
- customer-facing languages;
- internal communication rules;
- approval authority and escalation rules;
- business hours and service rules;
- telephone and call-transfer requirements;
- email and messaging requirements;
- accounting, finance and invoice workflows;
- CRM, booking, document or other system connections;
- customer data and permitted knowledge sources;
- documents, policies, templates and examples;
- tone, style and branding requirements;
- privacy, security and access permissions;
- actions that always require human approval;
- testing scenarios and acceptance criteria.

## Build principle
Use the proven Royal Command base wherever possible. Do not create unnecessary custom code merely because a customer is different. Customise only the customer's genuine differences.

The target model is approximately:
- reusable Royal Command core: majority of the build;
- customer-specific configuration/integration: minority of the build;
- exact ratio varies by customer and build level.

## Customer experience rule
The customer should feel that they are describing their business, not studying AI engineering.

Kevin must translate ordinary customer descriptions into technical requirements. If the customer says, for example, “I want every missed call followed up and important calls reported to me,” Kevin must convert that into the required call routing, agent role, logging, notification and approval workflow.

## Incomplete information rule
Incomplete information is normal. Kevin must not reject the build simply because the customer has not supplied everything at once.

Kevin should:
- build what is safely supported by confirmed information;
- mark dependent items as waiting;
- place concise missing-information requests in the Customer Build Form;
- resume automatically when the customer adds the missing information.

## Change and update rule
The Customer Build Form remains active after initial deployment. Customers may continue adding new information. Kevin reviews new entries and determines whether they require:
- knowledge update;
- workflow update;
- agent instruction update;
- permission change;
- new integration;
- testing only;
- no action.

Material changes must be recorded and tested before production use.

## Human approval and safety
Kevin must not make high-risk business, financial, legal, security, payment or access-control changes beyond authorised scope without the required human approval.

Where Royal Command policy requires Harry or another authorised human to approve, Kevin prepares the change, explains the effect briefly, and waits for approval before execution.

## Completion standard
A customer build is not complete merely because settings were entered. It is complete only when the agreed functions have been tested and the customer can use them in the intended workflow.

For each completed component Kevin should retain:
- requirement;
- configuration/build action;
- test result;
- date;
- remaining limitation, if any.

## Internal learning rule
The Royal Command internal Katie–Elizabeth–Kevin operating system is the first reference implementation. Lessons learned from real Royal Command use should be converted into reusable templates, checklists and build rules so future customer builds become faster and more reliable.
