import { describe, expect, it } from "vitest";
import { deriveFactoryResumeState } from "./factoryResume";

function lane(laneId: string, status: string, reworkRound = 0, evidencePresent = status === "passed") {
  return { laneId, status, reworkRound, evidencePresent };
}

describe("Room Factory resume state", () => {
  it("continues from the first unfinished build lane", () => {
    const result = deriveFactoryResumeState([
      lane("core", "passed"),
      lane("domain", "passed"),
      lane("country", "planned"),
      lane("integrations", "planned"),
      lane("qa", "planned"),
    ]);
    expect(result).toEqual({ overallStatus: "IN_PROGRESS", nextAction: "RUN_BUILD_LANE", nextLaneId: "country" });
  });

  it("resumes rework on the exact lane", () => {
    const result = deriveFactoryResumeState([
      lane("core", "passed"),
      lane("domain", "fix_required", 1),
      lane("country", "planned"),
      lane("integrations", "planned"),
      lane("qa", "planned"),
    ]);
    expect(result.nextAction).toBe("RETRY_BUILD_LANE");
    expect(result.nextLaneId).toBe("domain");
  });

  it("moves to QA only after all build lanes pass", () => {
    const result = deriveFactoryResumeState([
      lane("core", "passed"), lane("domain", "passed"), lane("country", "passed"), lane("integrations", "passed"), lane("qa", "planned"),
    ]);
    expect(result.overallStatus).toBe("AWAITING_QA");
    expect(result.nextLaneId).toBe("qa");
  });

  it("reports completion only when QA passed", () => {
    const result = deriveFactoryResumeState([
      lane("core", "passed"), lane("domain", "passed"), lane("country", "passed"), lane("integrations", "passed"), lane("qa", "passed"),
    ]);
    expect(result).toEqual({ overallStatus: "PASSED", nextAction: "NONE", nextLaneId: null });
  });
});
