export const INTEGRATED_AGENT_PRICING_POLICY = {
  currency: "AUD",
  model: "Room subscription + one-time Integrated Agent implementation fee + ongoing maintenance/support",
  purpose:
    "Royal Command provides a Room first, then recommends an Integrated Agent implementation level based on the customer's required scale, complexity, integrations, workflow, permissions and customization.",
  customerSelectionRule:
    "Customers should not be expected to understand or configure complex agent architecture themselves. They describe their business and requirements in writing or by voice using the relevant Royal Command manual. Royal Command then recommends the appropriate implementation level.",
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
  pricingRule:
    "The + sign on Level 30 is intentional. The final price is not capped or predetermined and must be quoted according to actual enterprise scope, integrations, security, customization, testing and implementation requirements.",
  disclosureRule:
    "Do not present an estimated level as a guaranteed final price. Final implementation scope and price require Royal Command review and quotation.",
  katieInstruction:
    "Katie must retain this as Royal Command company pricing policy, use it when briefing Harry, and ensure customer-facing explanations remain concise and do not invent individual Level prices that have not been approved.",
} as const;
