export type FactoryLaneSnapshot = {
  laneId: string;
  status: string;
  reworkRound: number;
  evidencePresent: boolean;
};

const BUILD_ORDER = ["core", "domain", "country", "integrations"] as const;

export function deriveFactoryResumeState(lanes: FactoryLaneSnapshot[]) {
  const byId = new Map(lanes.map((lane) => [lane.laneId, lane]));

  for (const laneId of BUILD_ORDER) {
    const lane = byId.get(laneId);
    if (!lane) return { overallStatus: "INCOMPLETE", nextAction: "PREPARE_NEW_WORK", nextLaneId: laneId } as const;
    if (lane.status === "blocked" || lane.status === "failed") {
      return { overallStatus: "BLOCKED", nextAction: "INSPECT_BLOCKED_LANE", nextLaneId: laneId } as const;
    }
    if (lane.status === "fix_required") {
      return { overallStatus: "REWORK_REQUIRED", nextAction: "RETRY_BUILD_LANE", nextLaneId: laneId } as const;
    }
    if (lane.status !== "passed") {
      return { overallStatus: "IN_PROGRESS", nextAction: "RUN_BUILD_LANE", nextLaneId: laneId } as const;
    }
  }

  const qa = byId.get("qa");
  if (!qa) return { overallStatus: "INCOMPLETE", nextAction: "PREPARE_NEW_WORK", nextLaneId: "qa" } as const;
  if (qa.status === "passed") return { overallStatus: "PASSED", nextAction: "NONE", nextLaneId: null } as const;
  if (qa.status === "blocked" || qa.status === "failed") return { overallStatus: "BLOCKED", nextAction: "INSPECT_QA", nextLaneId: "qa" } as const;
  if (qa.status === "fix_required") return { overallStatus: "REWORK_REQUIRED", nextAction: "INSPECT_QA_FINDINGS", nextLaneId: "qa" } as const;
  return { overallStatus: "AWAITING_QA", nextAction: "RUN_OR_POLL_QA", nextLaneId: "qa" } as const;
}
