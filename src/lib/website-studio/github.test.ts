import { afterEach, expect, it, vi } from "vitest";
import { saveState } from "./github";
import type { WorkState } from "./contract";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("uses one non-branch ledger ref and rejects concurrent sibling updates across Rooms", async () => {
  vi.stubEnv("GITHUB_TOKEN", "test-only");
  let ledger = "parent"; let sequence = 0;
  const parents = new Map<string, string>();
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname; const body = JSON.parse(String(init.body)); calls.push({ path, body });
    if (path.endsWith("/git/trees")) return Response.json({ sha: `tree-${++sequence}` });
    if (path.endsWith("/git/commits")) { const sha = `commit-${++sequence}`; parents.set(sha, body.parents[0]); return Response.json({ sha }); }
    expect(path).toContain("/git/refs/rc-studio/");
    expect(body.force).toBe(false);
    if (parents.get(String(body.sha)) !== ledger) return Response.json({}, { status: 422 });
    ledger = String(body.sha); return Response.json({ object: { sha: ledger } });
  }));
  const state = { version: 1, workId: "one", roomHash: "room-a", status: "running" } as WorkState;
  const previous = { sha: "parent", state };
  const results = await Promise.allSettled([saveState(previous, state), saveState(previous, { ...state, workId: "two", roomHash: "room-b" })]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  expect(calls.some((call) => call.path.includes("/heads/"))).toBe(false);
});
