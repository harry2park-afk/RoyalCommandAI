import { describe, expect, it } from "vitest";
import { compileRoomFactoryBlueprint } from "./factory";
import { buildRoomFactoryRcaControlPlan } from "./factoryRcaPlan";

function blueprint() {
  return compileRoomFactoryBlueprint({
    roomName: "Global Test Room",
    templateId: "business",
    countryCode: "AU",
    languageTag: "en-AU",
    timeZone: "Australia/Sydney",
    currencyCode: "AUD",
    approvalMode: "approval",
  });
}

describe("Room Factory RCA V2 control plan", () => {
  it("uses only explicitly selected AIs and gives write authority to one Writer", () => {
    const plan = buildRoomFactoryRcaControlPlan(blueprint(), ["openai", "anthropic", "google"]);
    expect(plan.writer).toBe("openai");
    expect(plan.reviewers).toEqual(["anthropic", "google"]);
    expect(plan.taskPlan?.lanes.every((lane) => lane.writer === "openai")).toBe(true);
    expect(plan.taskPlan?.lanes.every((lane) => !lane.reviewers.includes(lane.writer))).toBe(true);
    expect(plan.readyForExecutionPreparation).toBe(true);
  });

  it("creates unique resource ownership and a dependency schedule", () => {
    const plan = buildRoomFactoryRcaControlPlan(blueprint(), ["openai", "anthropic"]);
    expect(plan.validation?.valid).toBe(true);
    expect(plan.lockPlan?.valid).toBe(true);
    expect(plan.lockPlan?.locks).toHaveLength(5);
    expect(new Set(plan.lockPlan?.locks.map((lock) => lock.resource)).size).toBe(5);
    expect(plan.lockPlan?.parallelBatches[0]).toEqual(["core"]);
    expect(plan.lockPlan?.parallelBatches[1]).toEqual(expect.arrayContaining(["domain", "country"]));
    expect(plan.lockPlan?.parallelBatches.at(-1)).toEqual(["qa"]);
  });

  it("blocks PASS planning when no independent reviewer is selected", () => {
    const plan = buildRoomFactoryRcaControlPlan(blueprint(), ["openai"]);
    expect(plan.readyForExecutionPreparation).toBe(false);
    expect(plan.blockers.join(" ")).toMatch(/independent/i);
    expect(plan.reviewEvidencePlan?.valid).toBe(false);
  });

  it("does not infer or append providers when none are explicitly selected", () => {
    const plan = buildRoomFactoryRcaControlPlan(blueprint(), []);
    expect(plan.selectedProviders).toEqual([]);
    expect(plan.writer).toBeNull();
    expect(plan.readyForExecutionPreparation).toBe(false);
  });
});
