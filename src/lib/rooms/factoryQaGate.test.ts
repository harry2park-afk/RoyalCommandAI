import { describe, expect, it } from "vitest";
import { evaluateFactoryQaEvidence } from "./factoryQaGate";

describe("Room Factory QA release evidence gate", () => {
  const successfulRuns = [
    { name: "Royal Command Quality Gate", status: "completed", conclusion: "success" },
    { name: "Royal Command Conflict Guard", status: "completed", conclusion: "success" },
    { name: "Royal Command Change Control", status: "completed", conclusion: "success" },
  ];

  it("passes only when all repository gates and Vercel succeed", () => {
    const result = evaluateFactoryQaEvidence(successfulRuns, [{ context: "Vercel", state: "success" }]);
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("waits when a repository gate is missing or incomplete", () => {
    const result = evaluateFactoryQaEvidence(successfulRuns.slice(0, 2), [{ context: "Vercel", state: "success" }]);
    expect(result.ready).toBe(false);
    expect(result.blockers.join(" ")).toMatch(/Change Control/);
  });

  it("blocks release when Vercel has not succeeded", () => {
    const result = evaluateFactoryQaEvidence(successfulRuns, [{ context: "Vercel", state: "pending" }]);
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("Vercel: pending");
  });
});
