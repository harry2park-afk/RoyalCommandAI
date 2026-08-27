import type { RcaTaskPlan } from "@/lib/rcaV2/masterTaskController";

export type RcaResourceLock = {
  resource: string;
  ownerLaneId: string;
  writer: string;
};

export type RcaLaneSchedule = {
  laneId: string;
  dependsOn: string[];
  parallelGroup: string | null;
  runnableAfter: string[];
  resources: string[];
};

export type RcaResourceLockPlan = {
  valid: boolean;
  persistentLocksCreated: false;
  locks: RcaResourceLock[];
  schedule: RcaLaneSchedule[];
  parallelBatches: string[][];
  conflicts: string[];
};

function topoBatches(plan: RcaTaskPlan): { batches: string[][]; conflicts: string[] } {
  const remaining = new Map(plan.lanes.map((lane) => [lane.id, new Set(lane.dependsOn)]));
  const done = new Set<string>();
  const batches: string[][] = [];
  const conflicts: string[] = [];

  while (remaining.size) {
    const ready = Array.from(remaining.entries())
      .filter(([, deps]) => Array.from(deps).every((dep) => done.has(dep)))
      .map(([id]) => id);

    if (!ready.length) {
      conflicts.push("Cannot derive lock schedule because dependencies contain a cycle or unresolved lane.");
      break;
    }

    batches.push(ready);
    for (const id of ready) {
      remaining.delete(id);
      done.add(id);
    }
  }

  return { batches, conflicts };
}

export function buildRcaResourceLockPlan(plan: RcaTaskPlan): RcaResourceLockPlan {
  const locks: RcaResourceLock[] = [];
  const conflicts: string[] = [];
  const seen = new Map<string, string>();

  for (const lane of plan.lanes) {
    for (const resource of lane.resources) {
      const key = resource.trim().toLowerCase();
      if (!key) continue;
      const existing = seen.get(key);
      if (existing && existing !== lane.id) {
        conflicts.push(`Resource ${resource} has multiple lane owners: ${existing}, ${lane.id}.`);
        continue;
      }
      seen.set(key, lane.id);
      locks.push({ resource, ownerLaneId: lane.id, writer: lane.writer });
    }
  }

  const topo = topoBatches(plan);
  conflicts.push(...topo.conflicts);

  const schedule: RcaLaneSchedule[] = plan.lanes.map((lane) => ({
    laneId: lane.id,
    dependsOn: [...lane.dependsOn],
    parallelGroup: lane.parallelGroup || null,
    runnableAfter: [...lane.dependsOn],
    resources: [...lane.resources],
  }));

  return {
    valid: conflicts.length === 0,
    persistentLocksCreated: false,
    locks,
    schedule,
    parallelBatches: topo.batches,
    conflicts,
  };
}
