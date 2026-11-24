import { expect, it } from "vitest";
import { creationText } from "./rcv3-creation";
it("shows English only for English and unsupported locales", () => {
  expect(creationText("draft", "en-AU")).not.toMatch(/[가-힣]/);
  expect(creationText("draft", "fr")).not.toMatch(/[가-힣]/);
});
it("adds necessary Korean explanation only for selected Korean locale", () => {
  expect(creationText("draft", "ko-KR")).toContain(creationText("draft", "en"));
  expect(creationText("draft", "ko-KR")).toMatch(/[가-힣]/);
});
