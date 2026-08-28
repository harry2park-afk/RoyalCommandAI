import type { AIProviderId } from "@/lib/ai/types";
import type { RoomFactoryBlueprint } from "@/lib/rooms/factory";
import {
  type RcaTaskPlan,
  validateRcaTaskPlan,
} from "@/lib/rcaV2/masterTaskController";
import { buildRcaResourceLockPlan } from "@/lib/rcaV2/resourceLockPlan";
import { buildRcaReviewEvidencePlan } from "@/lib/rcaV2/reviewEvidenceGate";

export type RoomFactoryRcaControlPlan = {
  selectedProviders: AIProviderId[];
  writer: AIProviderId | null;
  reviewers: AIProviderId[];
  taskPlan: RcaTaskPlan | null;
  validation: ReturnType<typeof validateRcaTaskPlan> | null;
  lockPlan: ReturnType<typeof buildRcaResourceLockPlan> | null;
  reviewEvidencePlan: ReturnType<typeof buildRcaReviewEvidencePlan> | null;
  readyForExecutionPreparation: boolean;
  blockers: string[];
};

const DEPENDENCIES: Record<string, string[]> = {
  core: [],
  domain: ["core"],
  integrations: ["domain"],
  country: ["core"],
  qa: ["domain", "integrations", "country"],
};

const EVIDENCE: Record<string, string[]> = {
  core: ["tenant-isolation-check", "host-boundary-check", "build-or-typecheck"],
  domain: ["changed-files", "unit-or-functional-test", "independent-review"],
  integrations: ["adapter-check", "secret-boundary-check", "independent-review"],
  country: ["country-profile-status", "locale-timezone-currency-check", "independent-review"],
  qa: ["full-build", "tests", "security-review", "rollback-point", "deployment-evidence-if-applicable"],
};

function uniqueProviders(providers: AIProviderId[]) {
  return Array.from(new Set(providers));
}

export function buildRoomFactoryRcaControlPlan(
  blueprint: RoomFactoryBlueprint,
  providers: AIProviderId[],
): RoomFactoryRcaControlPlan {
  const selectedProviders = uniqueProviders(providers);
  const writer = selectedProviders[0] || null;
  const reviewers = writer ? selectedProviders.filter((provider) => provider !== writer) : [];
  const blockers = [...blueprint.readiness.blockers];

  if (!writer) blockers.push("At least one explicitly selected connected AI is required for a Writer.");
  if (!reviewers.length) blockers.push("At least one independent selected AI is required for review before PASS.");

  if (!writer) {
    return {
      selectedProviders,
      writer: null,
      reviewers,
      taskPlan: null,
      validation: null,
      lockPlan: null,
      reviewEvidencePlan: null,
      readyForExecutionPreparation: false,
      blockers,
    };
  }

  const taskPlan: RcaTaskPlan = {
    summary: `Build ${blueprint.room.name} from ${blueprint.room.templateName} using Room Factory ${blueprint.version}.`,
    lanes: blueprint.lanes.map((lane) => ({
      id: lane.id,
      title: lane.name,
      writer,
      reviewers: [...reviewers],
      resources: [`room-factory/${lane.id}`],
      dependsOn: [...(DEPENDENCIES[lane.id] || [])],
      parallelGroup: lane.id === "domain" || lane.id === "country" ? "after-core" : undefined,
      evidence: [...(EVIDENCE[lane.id] || ["host-evidence"])],
    })),
    integrationOrder: ["core", "domain", "country", "integrations", "qa"],
    rollbackPlan: "Restore the last host-verified Room Factory manifest and prior verified code/deployment state. Never restore customer data, memory, credentials or secrets from a template clone.",
  };

  const validation = validateRcaTaskPlan(taskPlan);
  const lockPlan = buildRcaResourceLockPlan(taskPlan);
  const reviewEvidencePlan = buildRcaReviewEvidencePlan(taskPlan);

  blockers.push(...validation.conflicts, ...lockPlan.conflicts, ...reviewEvidencePlan.blockers);

  return {
    selectedProviders,
    writer,
    reviewers,
    taskPlan,
    validation,
    lockPlan,
    reviewEvidencePlan,
    readyForExecutionPreparation:
      blueprint.readiness.readyForSafeBuild
      && validation.valid
      && lockPlan.valid
      && reviewEvidencePlan.valid
      && blockers.length === 0,
    blockers: Array.from(new Set(blockers)),
  };
}
