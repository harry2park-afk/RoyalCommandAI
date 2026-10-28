import { expect, it } from "vitest";
import { previewSessionCookies } from "./preview";

it("preserves existing same-site Vercel and chunked app sessions without forwarding bypass or unrelated credentials", () => {
  const names = ["_vercel_jwt", "sb-project-auth-token", "sb-project-auth-token.0", "sb-project-auth-token.1", "sb-project-auth-token.code-verifier", "sb-other-auth-token", "__vercel_protection_bypass", "VERCEL_TOKEN", "other-session"];
  expect(previewSessionCookies(names.map(name => ({ name, value: "opaque" })), "project").map(cookie => cookie.name)).toEqual(names.slice(0, 4));
  expect(previewSessionCookies([], "project")).toEqual([]);
});
