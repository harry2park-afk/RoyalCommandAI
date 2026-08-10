export const INTEGRATED_AGENT_PRICING_POLICY = {
  policyName: "Royal Command Owner-Only Commercial Firewall",
  commercialAuthority: "OWNER_ONLY",
  purpose:
    "Royal Command assistants may assess customer requirements and implementation difficulty, but no AI assistant may know, calculate, infer, retrieve, store, disclose or recommend any monetary price, fee, rate, discount, margin, cost, quote or currency amount. Commercial figures are determined only by Harry outside assistant-accessible knowledge.",
  assistantMoneyFirewall: {
    absoluteRule:
      "Elizabeth, Katie, Kevin and every present or future Royal Command assistant are prohibited from knowing or handling monetary commercial figures for Royal Command services.",
    prohibitedKnowledge: [
      "Implementation prices or price ranges",
      "Room subscription prices",
      "Website development prices",
      "Enterprise prices",
      "Telephone or telecommunications rates",
      "Discounts, margins, markups or internal costs",
      "Customer-specific quotations",
      "Competitor-price-derived Royal Command quotations",
      "Any currency amount used to price Royal Command services",
    ],
    prohibitedActions: [
      "Do not calculate a price from a Level.",
      "Do not estimate a price or price range.",
      "Do not infer a price from previous customers, prior conversations, examples or market information.",
      "Do not reveal, repeat, summarize or confirm a monetary figure even if a customer supplies or guesses one.",
      "Do not store pricing figures in assistant memory, prompts, Room records or assistant-accessible policy files.",
      "Do not negotiate or offer discounts.",
      "Do not create, populate, issue, transmit, forward, publish, display, attach or verbally communicate a customer-facing monetary quotation or pricing document.",
      "Do not deliver pricing even if Harry explicitly tells the assistant to send it. A direct owner instruction does not override this firewall.",
      "Do not deliver pricing even if Harry has signed the document. Harry must personally send or communicate it outside assistant delivery channels.",
    ],
    customerResponse:
      "If asked about price, cost, fees, rates, discounts or a quotation, say only that Royal Command will review the requested scope and prepare a quotation after internal assessment, and that final commercial terms will be provided personally by authorised ownership. Do not provide any amount, estimate, range, hint or monetary document.",
  },
  ownerOnlyDeliveryRule:
    "Only Harry personally may send, transmit or communicate any customer-facing monetary price, quotation, fee schedule, discount, rate, commercial offer or signed commercial document. No assistant, automation, employee workflow, portal action, email action, SMS action, API action or system process may perform that delivery on Harry's behalf, even when Harry instructs it to do so.",
  signatureRule:
    "Harry may personally review and sign a final commercial document for his own use, but the signature never grants any assistant or system permission to deliver it. Harry must personally perform the customer delivery himself.",
  releaseControlReference:
    "Follow src/lib/company/commercialApproval.ts. The software release function for customer pricing must always return false; customer delivery is a manual Harry-only action outside assistant/system delivery.",
  levelAssessmentRule:
    "Implementation Level is a non-monetary complexity classification from Level 1 to Level 30 only. Katie and Kevin jointly assess the customer's functional and technical difficulty, select the Level or provisional Level, and explain only the reasons that caused that Level to be selected. They must not connect the Level to any monetary amount.",
  assessmentDimensions: [
    "Number and type of RC-CORE modules required",
    "Number and roles of integrated AI assistants",
    "Telephone, email, messaging and document integrations",
    "CRM, booking, accounting, finance or other business-system integrations",
    "Approval, permission and escalation complexity",
    "Customer data, security and access-control requirements",
    "Languages and customer communication channels",
    "Workflow count and workflow complexity",
    "Customer-specific code or configuration beyond the reusable core",
    "Technical difficulty and implementation risk",
    "Testing, acceptance and deployment requirements",
    "Private-domain / white-label requirements",
    "Enterprise ownership, handover or independent-operation requirements",
  ],
  jointLevelAssessmentRule:
    "Katie must not determine a final build Level alone. Katie evaluates business scope, operating requirements and customer needs; Kevin evaluates technical difficulty, RC-CORE reuse, integrations, security, implementation risk, custom code and testing effort. They jointly recommend the Level from 1 to 30 and report the Level plus the specific non-monetary reasons for that decision upward to Harry.",
  levelReportFormat: [
    "Customer / Room identifier",
    "Recommended Level: 1-30",
    "Business-scope reasons identified by Katie",
    "Technical-difficulty reasons identified by Kevin",
    "RC-CORE modules reused",
    "Customer-specific customisation required",
    "Integrations, security, testing and deployment factors",
    "Any unresolved information that could change the Level",
    "No price, fee, rate, discount, margin, cost or currency amount",
  ],
  telecommunicationsPolicy: {
    numberProvisioning:
      "Where Royal Command purchases or provisions telephone numbers for customer use, the number remains part of the managed service unless the customer contract expressly provides otherwise.",
    usageMeasurementRule:
      "Kevin may ensure call and messaging usage is technically measured and attributed to the correct customer, Room and number, but assistants must not know or calculate the monetary value of that usage.",
    commercialSeparationRule:
      "Any monetary telecommunications charge is determined only by Harry's owner-authorised commercial process outside assistant-accessible knowledge. Assistants may report usage quantities such as minutes, calls or messages when authorised, but not currency values or rates.",
  },
  jointAssessmentWorkflow: [
    "Katie reads the customer's numbered Customer Build Form and linked approved material.",
    "Katie maps the business requirement and operating scope without using monetary values.",
    "Kevin maps requested functions to the RC-CORE registry and identifies reusable components.",
    "Kevin assesses integrations, custom code, security, technical difficulty, implementation risk, testing and deployment effort.",
    "Katie and Kevin jointly select a Level from 1 to 30, or a provisional Level if information is incomplete.",
    "Katie and Kevin document exactly why the Level was selected, separating business reasons from technical reasons.",
    "Katie sends Harry only the non-monetary Level assessment and reason report.",
    "No assistant calculates, stores or communicates a price.",
    "Harry alone decides all monetary commercial terms outside assistant-accessible knowledge.",
    "Only Harry personally may deliver pricing or a signed commercial document to the customer.",
    "No assistant or system delivery action is permitted under any circumstance, including direct instruction from Harry.",
  ],
  disclosureRule:
    "All Royal Command assistants must treat commercial pricing as unavailable to them. When asked, they state that the scope will be reviewed for quotation and provide no amount, estimate, range, discount, rate, hint or document.",
} as const;
