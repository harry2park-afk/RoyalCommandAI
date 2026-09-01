import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./FirstMeetingWindowV2.tsx", import.meta.url), "utf8");

describe("FirstMeetingWindowV2 encounter lifecycle contract", () => {
  it("reuses one persisted encounter id across retries", () => {
    expect(source).toContain('const stored = window.sessionStorage.getItem("rc_encounter_session_id");');
    expect(source).toContain("const encounterId = stored || crypto.randomUUID();");
    expect(source).toContain('if (!stored) window.sessionStorage.setItem("rc_encounter_session_id", encounterId);');
    expect(source).toContain("const encounterSessionId = encounterIdRef.current || crypto.randomUUID();");
    expect(source).toContain("body: JSON.stringify({ templateId, languageTag: customer.defaultLanguage || navigator.language || \"en\", countryCode: customer.countryCode || undefined, encounterSessionId })");
  });

  it("clears the encounter only inside the successful Room transition", () => {
    const transitionStart = source.indexOf("const enterRoom = () => {");
    const transitionEnd = source.indexOf("speak(responseText", transitionStart);
    expect(transitionStart).toBeGreaterThan(-1);
    expect(transitionEnd).toBeGreaterThan(transitionStart);

    const transition = source.slice(transitionStart, transitionEnd);
    expect(transition).toContain('window.sessionStorage.getItem("rc_encounter_session_id") === encounterSessionId');
    expect(transition).toContain('window.sessionStorage.removeItem("rc_encounter_session_id");');
    expect(transition).toContain('encounterIdRef.current = "";');
    expect(transition).toContain("router.push(`/rooms/${roomId}`);");
  });

  it("does not clear the encounter on the failure path", () => {
    const catchStart = source.indexOf("} catch {", source.indexOf("async function handleUserInput"));
    const finallyStart = source.indexOf("} finally", catchStart);
    expect(catchStart).toBeGreaterThan(-1);
    expect(finallyStart).toBeGreaterThan(catchStart);

    const failurePath = source.slice(catchStart, finallyStart);
    expect(failurePath).not.toContain('removeItem("rc_encounter_session_id")');
  });
});
