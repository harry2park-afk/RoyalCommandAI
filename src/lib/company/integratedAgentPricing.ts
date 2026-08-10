export const INTEGRATED_AGENT_PRICING_POLICY = {
  currency: "AUD",
  model: "Room subscription + one-time Integrated Agent implementation fee + ongoing maintenance/support + usage-based telecommunications charges",
  purpose:
    "Royal Command provides a Room first, then Katie and Kevin jointly recommend an Integrated Agent implementation level based on the customer's required scale, technical difficulty, complexity, integrations, workflow, permissions, customization and testing requirements.",
  customerSelectionRule:
    "Customers should not be expected to understand or configure complex agent architecture themselves. They describe their business and requirements in writing or by voice using the relevant Royal Command manual. Royal Command then recommends the appropriate implementation level.",
  coreReuseRule:
    "Royal Command should reuse approved RC-CORE modules wherever possible. The customer quote is based primarily on customer-specific configuration, integrations, testing, deployment, support and exceptional custom work rather than charging as though every reusable Royal Command component were rebuilt from zero.",
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
    "Katie must not determine a final build Level alone. Katie evaluates business scope, service model, commercial structure and customer requirements; Kevin evaluates technical difficulty, RC-CORE reuse, integrations, security, implementation risk, custom code and testing effort. The final recommended Level or Level range is produced jointly by Katie and Kevin and then submitted for authorised approval before a binding quotation is issued.",
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
      "Customer telephone usage is billed according to actual or metered usage and applicable provider charges, including relevant inbound/outbound call minutes, destinations, number rental, messaging or other carrier usage where applicable. Royal Command may apply an approved service/administration margin only when it is clearly disclosed in the customer plan or contract.",
    billingTransparencyRule:
      "Katie must be able to show the customer a clear monthly split between subscription/management fees and telecommunications usage charges. Kevin is responsible for confirming that the technical phone system records usage by customer/Room/number accurately enough for billing.",
    providerCostRule:
      "Carrier and AI-telephony provider rates can change. Do not hard-code a permanent per-minute price into Royal Command policy unless it is tied to a dated approved rate table. Current usage pricing should come from the active provider tariff or Royal Command approved rate schedule.",
  },
  levels: [
    {
      range: "Level 1-10",
      positioning: "Typical small to medium business implementations",
      pricingGuidance: "Up to approximately A$50,000 depending on scope",
    },
    {
      range: "Level 11-20",
      positioning: "Larger and more complex business implementations",
      pricingGuidance: "Up to approximately A$100,000 depending on scope",
    },
    {
      range: "Level 21-29",
      positioning: "Advanced enterprise and highly integrated implementations",
      pricingGuidance: "Up to approximately A$200,000 depending on scope",
    },
    {
      range: "Level 30",
      positioning: "Special Integrated Build for large enterprise / exceptional complexity",
      pricingGuidance: "A$286,000+",
    },
  ],
  jointAssessmentWorkflow: [
    "Katie reads the customer's numbered Customer Build Form and all linked documents, voice answers and approved email material.",
    "Katie maps the business requirement, service model, customer priorities and commercial scope.",
    "Kevin maps requested functions to the RC-CORE registry and identifies which components can be reused without rebuilding.",
    "Kevin assesses integrations, custom code, security, technical difficulty, implementation risk, testing and deployment effort.",
    "Katie and Kevin compare their assessments and agree a recommended Level or provisional Level range from 1 to 30.",
    "Katie prepares a concise scope and pricing briefing showing reusable RC-CORE modules, customer-specific work, telecommunications needs, dependencies and unresolved questions.",
    "If information is incomplete, only a provisional Level range may be given and the missing information must be identified.",
    "A binding customer quotation requires Royal Command authorised approval.",
  ],
  pricingRule:
    "The + sign on Level 30 is intentional. The final price is not capped or predetermined and must be quoted according to actual enterprise scope, integrations, security, customization, testing and implementation requirements.",
  disclosureRule:
    "Do not present an estimated level as a guaranteed final price. Final implementation scope and price require Royal Command review and quotation.",
  katieInstruction:
    "Katie must know the RC-CORE structure and this pricing policy, assess business/commercial scope together with Kevin's technical difficulty assessment, prepare the pricing basis for authorised approval, and separately account for variable telecommunications usage.",
  kevinInstruction:
    "Kevin must provide the technical difficulty assessment used for Level selection and ensure customer telephone numbers and call usage can be attributed to the correct customer/Room for usage-based billing.",
} as const;
