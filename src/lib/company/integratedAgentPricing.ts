export const INTEGRATED_AGENT_PRICING_POLICY = {
  currency: "AUD",
  model: "Room subscription + one-time Integrated Agent implementation fee + ongoing maintenance/support + usage-based telecommunications charges",
  purpose:
    "Royal Command provides a Room first, then Katie and Kevin jointly recommend an Integrated Agent implementation level based on the customer's required scale, technical difficulty, complexity, integrations, workflow, permissions, customization and testing requirements.",
  customerSelectionRule:
    "Customers should not be expected to understand or configure complex agent architecture themselves. They describe their business and requirements in writing or by voice using the relevant Royal Command manual. Royal Command then recommends the appropriate implementation level internally.",
  coreReuseRule:
    "Royal Command should reuse approved RC-CORE modules wherever possible. The internal pricing basis is based primarily on customer-specific configuration, integrations, testing, deployment, support and exceptional custom work rather than treating every reusable Royal Command component as a new build.",
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
    "Technical difficulty and implementation risk assessed by Kevin",
    "Testing, acceptance and deployment requirements",
    "Private-domain / white-label requirements",
    "Enterprise ownership, handover or independent-operation requirements",
  ],
  jointLevelAssessmentRule:
    "Katie must not determine a final build Level alone. Katie evaluates business scope, service model, commercial structure and customer requirements; Kevin evaluates technical difficulty, RC-CORE reuse, integrations, security, implementation risk, custom code and testing effort. The recommended Level or Level range is produced jointly by Katie and Kevin and reported only to Harry unless Harry expressly authorises another recipient.",
  confidentialityPolicy: {
    classification: "TOP SECRET — HARRY ONLY",
    rule:
      "All internal Level assessments, pricing calculations, cost bases, margins, discounts, quote drafts and final proposed prices are confidential and must not be disclosed to the customer or any external party before Harry's explicit approval.",
    customerDisclosureBan:
      "Katie, Kevin, Elizabeth and all other Royal Command assistants must not tell a customer an internally calculated Level, Level range, implementation price, discount, margin, cost basis, quote estimate or proposed commercial figure unless Harry has expressly approved that exact customer-facing disclosure.",
    reportDestination:
      "When a Level or price is calculated, Katie must prepare a private internal report addressed to Harry only. Kevin may provide technical difficulty and cost inputs to Katie, but neither Katie nor Kevin may send the resulting price to the customer without Harry's approval.",
    approvalGate:
      "Only after Harry explicitly approves the customer-facing price and terms may Katie prepare or release a quotation, proposal or pricing communication to the customer. Harry may change, reduce, increase, defer or reject the proposed price before disclosure.",
    noImpliedAuthority:
      "Customer requests for pricing, urgency, verbal acceptance, prior relationship, or previous pricing do not override this approval gate.",
  },
  serviceModels: [
    {
      name: "Royal Command Room Membership",
      rule: "Customer operates inside Royal Command. Royal Command core remains Royal Command property and service access depends on the active membership/service agreement.",
    },
    {
      name: "Private Business Website",
      rule: "Customer may use its own domain and branding while Royal Command continues to provide and manage the underlying Royal Command service, core modules and updates.",
    },
    {
      name: "Enterprise Full Ownership / Handover",
      rule: "A separately priced enterprise build may be designed for independent customer operation and handover. Customer-specific deliverables and handover scope must be stated in the contract while Royal Command reusable core IP is protected unless expressly sold or licensed otherwise.",
    },
  ],
  telecommunicationsPolicy: {
    numberProvisioning:
      "Where Royal Command purchases or provisions telephone numbers for customer use, the number remains part of the Royal Command managed service unless the customer's contract expressly provides otherwise.",
    subscriptionSeparationRule:
      "The monthly Room or service subscription covers the agreed platform, management and support service. Variable telecommunications usage must be tracked separately rather than silently absorbed into the base subscription unless a specific plan includes an approved allowance.",
    usageBillingRule:
      "Customer telephone usage is billed according to actual or metered usage and applicable provider charges, including relevant inbound/outbound call minutes, destinations, number rental, messaging or other carrier usage where applicable. Royal Command may apply an approved service/administration margin only when it has been approved for the relevant customer plan or contract.",
    internalPricingConfidentialityRule:
      "Carrier costs, Royal Command margins, internal rate construction and proposed usage markups are internal confidential information and must not be disclosed to customers unless Harry expressly approves the customer-facing rate schedule.",
    billingTransparencyRule:
      "After Harry approves the customer-facing tariff or plan, Katie may show the customer only the approved monthly split between subscription/management fees and telecommunications usage charges. Kevin is responsible for confirming that the technical phone system records usage by customer/Room/number accurately enough for billing.",
    providerCostRule:
      "Carrier and AI-telephony provider rates can change. Do not hard-code a permanent per-minute price into Royal Command policy unless it is tied to a dated approved rate table. Current internal usage pricing should come from the active provider tariff or Royal Command approved rate schedule.",
  },
  levels: [
    {
      range: "Level 1-10",
      positioning: "Typical small to medium business implementations",
      pricingGuidance: "Internal guidance: up to approximately A$50,000 depending on scope",
    },
    {
      range: "Level 11-20",
      positioning: "Larger and more complex business implementations",
      pricingGuidance: "Internal guidance: up to approximately A$100,000 depending on scope",
    },
    {
      range: "Level 21-29",
      positioning: "Advanced enterprise and highly integrated implementations",
      pricingGuidance: "Internal guidance: up to approximately A$200,000 depending on scope",
    },
    {
      range: "Level 30",
      positioning: "Special Integrated Build for large enterprise / exceptional complexity",
      pricingGuidance: "Internal guidance: A$286,000+",
    },
  ],
  jointAssessmentWorkflow: [
    "Katie reads the customer's numbered Customer Build Form and all linked documents, voice answers and approved email material.",
    "Katie maps the business requirement, service model, customer priorities and commercial scope.",
    "Kevin maps requested functions to the RC-CORE registry and identifies which components can be reused without rebuilding.",
    "Kevin assesses integrations, custom code, security, technical difficulty, implementation risk, testing and deployment effort.",
    "Katie and Kevin compare their assessments and agree a recommended internal Level or provisional Level range from 1 to 30.",
    "Katie prepares a confidential Harry-only scope and pricing briefing showing reusable RC-CORE modules, customer-specific work, telecommunications needs, dependencies and unresolved questions.",
    "If information is incomplete, only a provisional internal Level range may be recorded and the missing information must be identified.",
    "No Level, range, price or quote estimate is released externally until Harry explicitly approves the exact customer-facing amount and terms.",
  ],
  pricingRule:
    "The + sign on Level 30 is intentional. The final internal price is not capped or predetermined and must be calculated according to actual enterprise scope, integrations, security, customization, testing and implementation requirements, then submitted to Harry for approval.",
  disclosureRule:
    "DEFAULT = DO NOT DISCLOSE. Internal Level assessments, calculations and proposed prices are Harry-only confidential information. Customer-facing pricing exists only after Harry's explicit approval.",
  katieInstruction:
    "Katie must know the RC-CORE structure and this pricing policy, assess business/commercial scope together with Kevin's technical difficulty assessment, prepare the confidential pricing basis for Harry only, separately account for variable telecommunications usage, and never disclose a Level or price externally without Harry's explicit approval.",
  kevinInstruction:
    "Kevin must provide the technical difficulty assessment used for internal Level selection, ensure customer telephone numbers and call usage can be attributed to the correct customer/Room for usage-based billing, and must not disclose internal Level or price calculations to customers.",
} as const;
