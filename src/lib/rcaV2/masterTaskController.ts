import type { AIProviderId } from "@/lib/ai/types";

export type RcaWorkLane = {
  id: string;
  title: string;
  writer: AIProviderId;
  reviewers: AIProviderId[];
  resources: string[];
  dependsOn: string[];
  parallelGroup?: string;
  evidence: string[];
};

export type RcaTaskPlan = {
  summary: string;
  lanes: RcaWorkLane[];
  integrationOrder: string[];
  rollbackPlan: string;
};

export type RcaPlanValidation = {
  valid: boolean;
  conflicts: string[];
  warnings: string[];
};

function clean(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

export function validateRcaTaskPlan(plan: RcaTaskPlan): RcaPlanValidation {
  const conflicts: string[] = [];
  const warnings: string[] = [];
  const ids = plan.lanes.map((lane) => lane.id.trim()).filter(Boolean);
  const idSet = new Set(ids);

  if (!plan.summary.trim()) conflicts.push("Plan summary is required.");
  if (!plan.lanes.length) conflicts.push("At least one Work Lane is required.");
  if (idSet.size !== ids.length) conflicts.push("Work Lane IDs must be unique.");

  const resourceOwner = new Map<string, string>();
  for (const lane of plan.lanes) {
    lane.resources = clean(lane.resources);
    lane.dependsOn = clean(lane.dependsOn);
    lane.reviewers = Array.from(new Set(lane.reviewers.filter((p) => p !== lane.writer)));
    lane.evidence = clean(lane.evidence);

    if (!lane.id.trim()) conflicts.push("Every Work Lane requires an ID.");
    if (!lane.title.trim()) conflicts.push(`Lane ${lane.id || "(unknown)"} requires a title.`);
    if (!lane.resources.length) warnings.push(`Lane ${lane.id} has no declared resource boundary.`);
    if (!lane.reviewers.length) warnings.push(`Lane ${lane.id} has no independent reviewer.`);
    if (!lane.evidence.length) warnings.push(`Lane ${lane.id} has no evidence declaration.`);

    for (const dep of lane.dependsOn) {
      if (dep === lane.id) conflicts.push(`Lane ${lane.id} cannot depend on itself.`);
      else if (!idSet.has(dep)) conflicts.push(`Lane ${lane.id} depends on unknown lane ${dep}.`);
    }

    for (const resource of lane.resources) {
      const key = resource.toLowerCase();
      const owner = resourceOwner.get(key);
      if (owner && owner !== lane.id) {
        conflicts.push(`Resource collision: ${resource} is assigned to both ${owner} and ${lane.id}.`);
      } else {
        resourceOwner.set(key, lane.id);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(plan.lanes.map((lane) => [lane.id, lane]));
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const lane = byId.get(id);
    if (lane) {
      for (const dep of lane.dependsOn) if (visit(dep)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const id of ids) {
    if (visit(id)) {
      conflicts.push("Dependency cycle detected between Work Lanes.");
      break;
    }
  }

  const integration = clean(plan.integrationOrder);
  for (const id of integration) if (!idSet.has(id)) conflicts.push(`Integration order contains unknown lane ${id}.`);
  if (!plan.rollbackPlan.trim()) warnings.push("Rollback plan is not yet declared.");

  return { valid: conflicts.length === 0, conflicts, warnings };
}
