import {describe,it,expect} from "vitest";
import {applyRoomBrief,recommendedDesigns} from "./room-recommendations";
import {newRoomDraft,draftInputSchema} from "./room-draft";
import {simpleCreateText} from "../locale/rcv3-simple-create";
describe("simple room creation",()=>{
 it("prepares valid purpose-specific requests without adding paid services",()=>{
  const draft=applyRoomBrief(newRoomDraft(),"영어 공부를 하고 싶어요");
  expect(draft.purpose).toBe("education");expect(draft.tasks).toContain("AI Tutor");
  expect(draftInputSchema.safeParse(draft).success).toBe(true);
  expect(draft.secretary).toBe(false);expect(draft.specialAI).toBe(false);
  expect(recommendedDesigns("education").map(d=>d.id)).not.toEqual(recommendedDesigns("technology").map(d=>d.id));
 });
 it("updates custom requests while preserving deliberate deselections and design",()=>{
  const draft=applyRoomBrief(newRoomDraft(),"organise emails");
  const changed=applyRoomBrief({...draft,tasks:[],templateId:recommendedDesigns("education")[0].id},"organise appointments");
  expect(changed.answers.purpose).toEqual(["organise appointments"]);
  expect(changed.tasks).toEqual([]);expect(changed.templateId).not.toBeUndefined();
  expect(applyRoomBrief(changed,"").answers.purpose).toEqual([]);
 });
 it("removes obsolete selections when the purpose changes",()=>{
  const draft=applyRoomBrief(newRoomDraft(),"legal office");
  const next=applyRoomBrief({...draft,answers:{practice:["Family"]}},"영어 공부");
  expect(next.answers).toEqual({});expect(next.tasks).not.toContain("Legal Intake");
  expect(draftInputSchema.safeParse(next).success).toBe(true);
 });
 it("preserves old signed draft shape and enforces the description limit",()=>{
  expect(draftInputSchema.parse(newRoomDraft())).not.toHaveProperty("brief");
  expect(draftInputSchema.safeParse({...newRoomDraft(),brief:"x".repeat(301)}).success).toBe(false);
 });
 it("uses account language and falls back to English",()=>{
  expect(simpleCreateText("name","ko-KR")).toBe("1. 룸 이름");
  expect(simpleCreateText("name","en-AU")).toBe("1. Room name");
  expect(simpleCreateText("name","unknown")).toBe("1. Room name");
 });
});
