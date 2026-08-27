import type { RcaTaskPlan } from "@/lib/rcaV2/masterTaskController";

export type RcaLaneReviewState = "PLANNED" | "FIX_REQUIRED" | "BLOCKED" | "PASS";

export type RcaLaneReviewPlan = {
  laneId: string;
  writer: string;
  reviewers: string[];
  maxReworkRounds: 2;
  requiredEvidence: string[];
  state: RcaLaneReviewState;
  blockers: string[];
};

export type RcaReviewEvidencePlan = {
  valid: boolean;
  successAllowed: false;
  hostEvidenceRequired: true;
  lanes: RcaLaneReviewPlan[];
  blockers: string[];
  policy: {
    independentReviewerRequired: true;
    maxReworkRounds: 2;
    noEvidenceNoSuccess: true;
  };
};

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildRcaReviewEvidencePlan(plan: RcaTaskPlan): RcaReviewEvidencePlan {
  const blockers: string[] = [];
  const lanes = plan.lanes.map((lane): RcaLaneReviewPlan => {
    const laneBlockers: string[] = [];
    const reviewers = uniq(lane.reviewers).filter((reviewer) => reviewer !== lane.writer);
    const requiredEvidence = uniq(lane.evidence);

    if (!reviewers.length) {
      laneBlockers.push(`Lane ${lane.id} requires at least one reviewer independent from writer ${lane.writer}.`);
    }
    if (!requiredEvidence.length) {
      laneBlockers.push(`Lane ${lane.id} requires host-verifiable evidence before PASS.`);
    }

    blockers.push(...laneBlockers);
    return {
      laneId: lane.id,
      writer: lane.writer,
      reviewers,
      maxReworkRounds: 2,
      requiredEvidence,
      state: laneBlockers.length ? "BLOCKED" : "PLANNED",
      blockers: laneBlockers,
    };
  });

  if (!plan.rollbackPlan.trim()) {
    blockers.push("A rollback plan is required before any production-affecting SUCCESS may be declared.");
  }

  return {
    valid: blockers.length === 0,
    successAllowed: false,
    hostEvidenceRequired: true,
    lanes,
    blockers,
    policy: {
      independentReviewerRequired: true,
      maxReworkRounds: 2,
      noEvidenceNoSuccess: true,
    },
  };
}
