export type ProfessionalLegalCapability = {
  id: string;
  name: string;
  description: string;
  premium?: boolean;
};

export const PROFESSIONAL_LEGAL_CAPABILITIES: ProfessionalLegalCapability[] = [
  {
    id: "ai-legal-secretary",
    name: "AI Legal Secretary",
    description: "Assists with client intake, correspondence drafts, matter notes, reminders, document preparation and day-to-day legal office administration.",
  },
  {
    id: "matter-file-management",
    name: "Matter & Client File Management",
    description: "Organises client files, evidence, correspondence, pleadings, contracts, chronologies and matter folders with strict Room data isolation.",
  },
  {
    id: "legal-drafting",
    name: "Legal Drafting & Document Review",
    description: "Prepares and reviews drafts, letters, agreements, submissions, briefs and other legal working documents for lawyer review and approval.",
  },
  {
    id: "legal-research",
    name: "Jurisdiction-Aware Legal Research",
    description: "Researches legislation, regulations, court rules and authorities for the selected country, state, province or other jurisdiction.",
  },
  {
    id: "precedent-research",
    name: "Case Law & Precedent Research",
    description: "Finds relevant authorities and records court, year, citation, legal issue and the way each authority may support or weaken the matter.",
  },
  {
    id: "ai-mock-trial",
    name: "AI Mock Trial & Litigation Strategy",
    description: "Runs evidence-grounded litigation simulations for counsel, including opposing cases, examination, cross-examination, judicial issues and Red Team analysis.",
    premium: true,
  },
];

export const PROFESSIONAL_LEGAL_MOCK_TRIAL_POLICY = {
  id: "ai-mock-trial",
  name: "AI Mock Trial & Litigation Strategy",
  audience: "Professional Legal Room only",
  purpose:
    "Provide lawyers and law firms with a structured simulation of a client's matter for preparation, issue spotting and strategy testing. It is a professional reference tool and does not replace the court, judge, lawyer or formal legal opinion.",
  requiredInputs: [
    "Selected jurisdiction and court level where known",
    "Client facts and chronology",
    "Client documents and pleadings available to the Room",
    "Evidence and witness material available to the Room",
    "Known opposing case, allegations or defence where available",
  ],
  authorityRules: [
    "Use the law of the selected country and sub-jurisdiction relevant to the matter.",
    "Ground material legal propositions in verifiable legislation, court rules or case law where available.",
    "For every relied-on precedent, preserve enough source metadata for a lawyer to verify it: case name, court, year and citation or source reference where available.",
    "Never invent a case, citation, statute, court rule or quotation.",
    "Clearly mark authorities that have not yet been independently verified.",
    "Do not silently mix authorities from different jurisdictions.",
  ],
  simulationRoles: [
    "Applicant / Plaintiff counsel",
    "Respondent / Defendant counsel",
    "Witness examination",
    "Cross-examination",
    "Judge / judicial issue analysis",
    "Jury-style fact assessment when legally relevant",
    "Independent Red Team opposing the client's preferred theory",
  ],
  scenarios: [
    "Current evidence and facts",
    "Key evidence admitted",
    "Key evidence excluded or successfully challenged",
    "Opposing party's strongest plausible case",
    "Client's strongest legally supportable case",
    "Settlement or negotiated-resolution scenario where relevant",
  ],
  requiredOutput: [
    "Jurisdiction and assumed court context",
    "Material facts and disputed facts",
    "Issues to be determined",
    "Applicable law and verified authorities",
    "Client-side submissions",
    "Opposing-side submissions",
    "Witness and cross-examination issues",
    "Evidence strengths, weaknesses and admissibility questions",
    "Red Team attack on the case",
    "Missing facts or evidence that counsel should investigate",
    "Reasoned possible outcomes without guaranteeing a result",
    "Settlement and litigation-strategy considerations where appropriate",
  ],
  safeguards: [
    "Simulation results are decision-support material for legal professionals, not a prediction or guarantee of a court outcome.",
    "Do not present a fabricated percentage chance of success as a measured fact.",
    "Important external documents, filings, client advice and communications remain subject to the Professional Legal Room human-approval rules.",
    "The system must distinguish facts supplied by the client from assumptions introduced for a simulation.",
    "Conflicting evidence must be surfaced rather than silently reconciled.",
  ],
} as const;
