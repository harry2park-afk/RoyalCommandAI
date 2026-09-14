import { beforeEach, expect, it, vi } from "vitest";
const vm = vi.hoisted(() => ({ writeFiles: vi.fn(), runCommand: vi.fn(), stop: vi.fn(), delete: vi.fn(), fs: { readFile: vi.fn() } }));
const create = vi.hoisted(() => vi.fn());
vi.mock("@vercel/sandbox", () => ({ Sandbox: { create } }));
import { buildInSandbox } from "./runner";
const config = { image: `test/toolchain@sha256:${"a".repeat(64)}`, projectId: "prj_test", teamId: "team_test", token: async () => "TEST_SECRET" };
beforeEach(() => {
  vi.clearAllMocks(); create.mockResolvedValue(vm); vm.runCommand.mockResolvedValue({ exitCode: 0 }); vm.fs.readFile.mockResolvedValue(Buffer.from("safe source"));
});
it("mock VM: denies networking, disables snapshots and never passes credentials to commands", async () => {
  const result = await buildInSandbox([{ path: "src/app.ts", content: "safe source" }], ["src/app.ts"], config);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ networkPolicy: "deny-all", persistent: false, env: {}, image: config.image }));
  expect(JSON.stringify(vm.runCommand.mock.calls)).not.toContain("TEST_SECRET");
  expect(JSON.stringify(result)).not.toContain("TEST_SECRET");
  expect(vm.delete).toHaveBeenCalledTimes(1); expect(result.acceptance).toBe("not_checked");
});
it("mock VM: build failure blocks tests and cleans up", async () => {
  vm.runCommand.mockResolvedValueOnce({ exitCode: 1 });
  await expect(buildInSandbox([{ path: "src/app.ts", content: "safe source" }], ["src/app.ts"], config)).rejects.toThrow("RUNNER_BUILD_FAILED");
  expect(vm.runCommand).toHaveBeenCalledTimes(1); expect(vm.delete).toHaveBeenCalledTimes(1);
});
it("mock VM: source changes during build invalidate evidence", async () => {
  vm.fs.readFile.mockResolvedValue(Buffer.from("changed"));
  await expect(buildInSandbox([{ path: "src/app.ts", content: "safe source" }], ["src/app.ts"], config)).rejects.toThrow("RUNNER_SOURCE_CHANGED");
});
it("no VM call without credentials or immutable image", async () => {
  await expect(buildInSandbox([{ path: "src/app.ts", content: "safe source" }], ["src/app.ts"], { ...config, token: async () => "" })).rejects.toThrow("RUNNER_NOT_CONNECTED");
  await expect(buildInSandbox([{ path: "src/app.ts", content: "safe source" }], ["src/app.ts"], { ...config, image: "latest" })).rejects.toThrow("RUNNER_IMAGE_NOT_PINNED");
  expect(create).not.toHaveBeenCalled();
});
