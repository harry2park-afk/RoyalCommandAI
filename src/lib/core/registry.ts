export type RoyalCommandCoreModule = {
  id: string;
  version: string;
  name: string;
  status: "active" | "in-progress" | "planned";
  reusable: boolean;
  customerCopyPolicy: "core-reference" | "template-copy" | "customer-config";
  files: string[];
};

/**
 * Royal Command Core Registry
 *
 * Rule: never rebuild an approved reusable capability from zero for each customer.
 * Customer deployments should reference or copy approved core modules, then add
 * customer-specific configuration and integrations separately.
 */
export const RC_CORE_REGISTRY: RoyalCommandCoreModule[] = [
  {
    id: "RC-CORE-001",
    version: "1.0.0",
    name: "Identity, Login & Security Gate",
    status: "active",
    reusable: true,
    customerCopyPolicy: "core-reference",
    files: ["src/app/login/page.tsx", "src/lib/security/royal-security.ts"],
  },
  {
    id: "RC-CORE-002",
    version: "1.0.0",
    name: "Customer Room & Room Builder",
    status: "active",
    reusable: true,
    customerCopyPolicy: "template-copy",
    files: [
      "src/app/dashboard/page.tsx",
      "src/app/rooms/[id]/page.tsx",
      "src/lib/rooms/templates.ts",
    ],
  },
  {
    id: "RC-CORE-003",
    version: "1.0.0",
    name: "Company Assistant Roles — Katie, Kevin, Elizabeth",
    status: "in-progress",
    reusable: true,
    customerCopyPolicy: "template-copy",
    files: ["src/lib/company/assistantRoles.ts"],
  },
  {
    id: "RC-CORE-004",
    version: "1.0.0",
    name: "Multi-Provider AI Orchestration",
    status: "in-progress",
    reusable: true,
    customerCopyPolicy: "core-reference",
    files: [
      "src/lib/ai/orchestrator.ts",
      "src/lib/ai/connectors.ts",
      "src/lib/ai/types.ts",
    ],
  },
  {
    id: "RC-CORE-005",
    version: "0.5.0",
    name: "AI Synthesis & Decision Layer",
    status: "in-progress",
    reusable: true,
    customerCopyPolicy: "core-reference",
    files: ["src/lib/ai/synthesize.ts"],
  },
  {
    id: "RC-CORE-006",
    version: "0.5.0",
    name: "Telephone, Voice & Call Routing",
    status: "in-progress",
    reusable: true,
    customerCopyPolicy: "customer-config",
    files: [],
  },
  {
    id: "RC-CORE-007",
    version: "0.5.0",
    name: "Email, Documents & File Intake",
    status: "in-progress",
    reusable: true,
    customerCopyPolicy: "customer-config",
    files: [],
  },
  {
    id: "RC-CORE-008",
    version: "0.5.0",
    name: "Work Orders, Records & Reporting",
    status: "planned",
    reusable: true,
    customerCopyPolicy: "template-copy",
    files: [],
  },
  {
    id: "RC-CORE-009",
    version: "0.5.0",
    name: "Persistent Customer Build Form",
    status: "in-progress",
    reusable: true,
    customerCopyPolicy: "template-copy",
    files: ["docs/KEVIN_CUSTOMER_AGENT_BUILD_MANUAL.md"],
  },
  {
    id: "RC-CORE-010",
    version: "0.1.0",
    name: "Customer Clone, Deployment & Upgrade Manager",
    status: "planned",
    reusable: true,
    customerCopyPolicy: "core-reference",
    files: [],
  },
];

export function getCoreModule(id: string) {
  return RC_CORE_REGISTRY.find((module) => module.id === id);
}
