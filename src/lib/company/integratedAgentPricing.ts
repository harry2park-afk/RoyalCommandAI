export const INTEGRATED_AGENT_PRICING_POLICY = {
  policyName: "Royal Command Owner-Only Commercial Firewall",
  commercialAuthority: "OWNER_ONLY",
  purpose:
    "Royal Command assistants may assess customer requirements and implementation difficulty, but no AI assistant may know, calculate, infer, retrieve, store, disclose or recommend any monetary price, fee, rate, discount, margin, cost, quote or currency amount. Commercial figures are determined only through the owner-authorised commercial process outside assistant-accessible knowledge.",
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
    ],
    customerResponse:
      "If asked about price, cost, fees, rates, discounts, quotations or any money amount, the assistant must say that commercial pricing is determined by authorised management and that the request will be referred upward for an official response. The assistant must not add an estimate or hint.",
  },
  levelAssessmentRule:
    "Implementation Level is a non-monetary complexity classification only. Katie and Kevin may jointly assess the customer's functional and technical difficulty and recommend a Level or provisional Level range, but they must not connect that Level to any monetary amount.",
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
    "Katie must not determine a final build Level alone. Katie evaluates business scope, operating requirements and customer needs; Kevin evaluates technical difficulty, RC-CORE reuse, integrations, security, implementation risk, custom code and testing effort. They jointly recommend only the non-monetary Level or Level range and submit it upward.",
  telecommunicationsPolicy: {
    numberProvisioning:
      "Where Royal Command purchases or provisions telephone numbers for customer use, the number remains part of the managed service unless the customer contract expressly provides otherwise.",
    usageMeasurementRule:
      "Kevin may ensure call and messaging usage is technically measured and attributed to the correct customer, Room and number, but assistants must not know or calculate the monetary value of that usage.",
    commercialSeparationRule:
      "Any monetary telecommunications charge is calculated only by the owner-authorised billing process outside assistant-accessible knowledge. Assistants may report usage quantities such as minutes, calls or messages when authorised, but not currency values or rates.",
  },
  jointAssessmentWorkflow: [
    "Katie reads the customer's numbered Customer Build Form and linked approved material.",
    "Katie maps the business requirement and operating scope without using monetary values.",
    "Kevin maps requested functions to the RC-CORE registry and identifies reusable components.",
    "Kevin assesses integrations, custom code, security, technical difficulty, implementation risk, testing and deployment effort.",
    "Katie and Kevin agree a non-monetary Level or provisional Level range.",
    "Katie prepares a scope briefing and sends the Level assessment upward to authorised management.",
    "No assistant calculates, stores or communicates a price.",
    "Only after authorised management separately determines and approves commercial terms may an official customer quotation be issued through the approved non-assistant commercial channel.",
  ],
  disclosureRule:
    "All Royal Command assistants must treat commercial pricing as unavailable to them. When asked, they refer the matter upward and provide no amount, estimate, range, discount, rate or hint.",
} as const;
