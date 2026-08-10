export const INTEGRATED_AGENT_PRICING_POLICY = {
  currency: "AUD",
  model: "Room subscription + one-time Integrated Agent implementation fee + ongoing maintenance/support",
  purpose:
    "Royal Command provides a Room first, then recommends an Integrated Agent implementation level based on the customer's required scale, complexity, integrations, workflow, permissions and customization.",
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
    "Testing, acceptance and deployment requirements",
    "Private-domain / white-label requirements",
    "Enterprise ownership, handover or independent-operation requirements",
  ],
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
  katieAssessmentWorkflow: [
    "Read the customer's numbered Customer Build Form and all linked documents, voice answers and approved email material.",
    "Map requested functions to the RC-CORE registry and identify which components can be reused without rebuilding.",
    "List customer-specific differences, integrations, permissions, deployment requirements and testing requirements.",
    "Identify the appropriate implementation Level or Level range from 1 to 30.",
    "Prepare a concise scope summary showing reusable RC-CORE modules, customer-specific work, dependencies and unresolved questions.",
    "Apply only approved Royal Command pricing policy. Do not invent an individual Level price that has not been approved.",
    "If information is incomplete, provide a provisional Level range and clearly mark what must be confirmed before a final quotation.",
    "Prepare the recommended Level, pricing basis and quote briefing for Harry / the authorised approver before a binding customer quotation is issued.",
  ],
  pricingRule:
    "The + sign on Level 30 is intentional. The final price is not capped or predetermined and must be quoted according to actual enterprise scope, integrations, security, customization, testing and implementation requirements.",
  disclosureRule:
    "Do not present an estimated level as a guaranteed final price. Final implementation scope and price require Royal Command review and quotation.",
  katieInstruction:
    "Katie must know the RC-CORE structure and this pricing policy, assess what the customer actually needs, recommend the appropriate build Level, distinguish reusable core from customer-specific work, prepare the pricing basis for Harry, and never invent unapproved individual Level prices.",
} as const;
