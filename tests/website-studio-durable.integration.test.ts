import { expect, it } from "vitest";
import { start, getRun } from "workflow/api";
import { waitForSleep } from "@workflow/vitest";
import { studioConnectionWorkflow } from "../src/lib/website-studio/v2/durable";

it("real local Workflow engine persists, suspends and resumes a run", async () => {
  const run = await start(studioConnectionWorkflow);
  expect(run.runId).toMatch(/^wrun_/);
  const sleepId = await waitForSleep(run);
  const reopened = getRun(run.runId);
  await reopened.wakeUp({ correlationIds: [sleepId] });
  expect(await reopened.returnValue).toEqual({ first: 1, second: 2, resumed: true });
  expect(await reopened.status).toBe("completed");
});
