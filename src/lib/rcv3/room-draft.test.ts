import { describe, expect, it } from "vitest";
import { newRoomDraft, changePurpose, draftInputSchema, readDraftRegistry, saveRoomDraft, roomPurposes, selectSecretary, secretarySetupValid } from "./room-draft";
import type { CloudStore } from "./cloud-state";
const id = "10000000-0000-4000-8000-000000000001";
function memoryStore(): CloudStore {
  const files = new Map<string, unknown>();
  return {
    async list(folder, limit) { return [...files.keys()].filter(k => k.startsWith(`${folder}/`)).sort().reverse().slice(0, limit).map(k => ({ name: k.split("/").at(-1)! })) as Awaited<ReturnType<CloudStore["list"]>>; },
    async read(key) { if (!files.has(key)) throw new Error("RCV3_STORAGE"); return structuredClone(files.get(key)); },
    async insert(key, value) { if (files.has(key)) throw new Error("RCV3_CONFLICT"); files.set(key, structuredClone(value)); },
  };
}
describe("account room drafts", () => {
  it("saves and restores the customer's secretary contacts as unverified setup only", async () => {
    const store=memoryStore();
    const input={...newRoomDraft(),secretary:true,secretarySetup:{email:"customer@example.test",phone:"+61 2 5550 1234"}};
    await saveRoomDraft(store,{id,expectedRevision:0,input});
    expect((await readDraftRegistry(store)).drafts[0].input.secretarySetup).toEqual(input.secretarySetup);
    expect(secretarySetupValid(input)).toBe(true);
    expect(draftInputSchema.safeParse({...input,secretarySetup:{...input.secretarySetup,verified:true,oauthToken:"secret"}}).success).toBe(false);
    expect(draftInputSchema.safeParse({...input,secretarySetup:{...input.secretarySetup,phone:"1".repeat(41)}}).success).toBe(false);
  });
  it("starts new drafts empty and clears current contact fields when secretary is deselected",async()=>{
    const input={...newRoomDraft(),secretary:true,secretarySetup:{email:"customer@example.test",phone:"+61255501234"}};
    expect(selectSecretary(input,false).secretarySetup).toEqual({email:"",phone:""});
    expect(newRoomDraft().secretarySetup).toEqual({email:"",phone:""});
    const store=memoryStore();await saveRoomDraft(store,{id,expectedRevision:0,input:{...input,secretary:false}});
    expect((await readDraftRegistry(store)).drafts[0].input.secretarySetup).toEqual({email:"",phone:""});
  });
  it("restores older saved drafts without contact fields and validates contact entry separately",()=>{
    const {secretarySetup,...old}=newRoomDraft();
    expect(draftInputSchema.parse(old).secretarySetup).toEqual({email:"",phone:""});
    expect(secretarySetupValid({...newRoomDraft(),secretary:true})).toBe(false);
    expect(secretarySetupValid({...newRoomDraft(),secretary:true,secretarySetup:{email:"invalid",phone:"0255501234"}})).toBe(false);
    expect(secretarySetupValid(newRoomDraft())).toBe(true);
  });
  it("retains the existing 40 purposes and removes unnecessary questions", () => {
    expect(roomPurposes).toHaveLength(40);
    expect(roomPurposes.find(p => p.id === "legal")?.fields.map(f => f.id)).toEqual(["practice", "otherPractice", "legalAiPriority", "customRequest", "advancedRequests"]);
    expect(roomPurposes.find(p => p.id === "legal")?.fields.find(f=>f.id==="practice")?.options).toContain("Other");
  });
  it("stores an unlisted legal request only as draft text", async () => {
    const store=memoryStore();
    const input={...newRoomDraft(),purpose:"legal",answers:{customRequest:["Find a specialist case management integration"]}};
    await saveRoomDraft(store,{id,expectedRevision:0,input});
    expect((await readDraftRegistry(store)).drafts[0].input.answers.customRequest).toEqual(input.answers.customRequest);
    expect(draftInputSchema.safeParse({...input,answers:{customRequest:["x".repeat(301)]}}).success).toBe(false);
    expect(draftInputSchema.safeParse({...input,purpose:"accounting"}).success).toBe(false);
  });
  it("requires a description when another legal practice area is selected",()=>{
    const draft={...newRoomDraft(),purpose:"legal",answers:{practice:["Other"],otherPractice:["Employment law"]}};
    expect(draftInputSchema.safeParse(draft).success).toBe(true);
    expect(draftInputSchema.safeParse({...draft,answers:{practice:["Other"]}}).success).toBe(false);
    expect(draftInputSchema.safeParse({...draft,answers:{practice:["Other"],otherPractice:["x".repeat(301)]}}).success).toBe(false);
  });
  it("persists an unpaid draft and restores purpose, design and paid wishes", async () => {
    const store = memoryStore(); const input = { ...newRoomDraft(), name: "My legal room", purpose: "legal", answers: { practice: ["Family"] }, secretary: true, plan: "paid" as const, providers: ["openai" as const] };
    await saveRoomDraft(store, { id, expectedRevision: 0, input });
    const restored = await readDraftRegistry(store);
    expect(restored.drafts[0].input).toEqual(input);
    expect(restored.drafts[0]).not.toHaveProperty("paid");
    expect(restored.drafts[0]).not.toHaveProperty("connectedProviders");
  });
  it("does not overwrite another tab's newer draft", async () => {
    const store = memoryStore();
    await saveRoomDraft(store, { id, expectedRevision: 0, input: { ...newRoomDraft(), name: "First" } });
    await expect(saveRoomDraft(store, { id, expectedRevision: 0, input: { ...newRoomDraft(), name: "Stale" } })).rejects.toThrow("RCV3_CONFLICT");
    expect((await readDraftRegistry(store)).drafts[0].input.name).toBe("First");
  });
  it("allows only one concurrent writer at the same revision", async () => {
    const store = memoryStore();
    const results = await Promise.allSettled(["A", "B"].map(name => saveRoomDraft(store, { id, expectedRevision: 0, input: { ...newRoomDraft(), name } })));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((await readDraftRegistry(store)).revision).toBe(1);
  });
  it("does not discard another draft when updating one", async () => {
    const store = memoryStore(); const second = "10000000-0000-4000-8000-000000000002";
    await saveRoomDraft(store, { id, expectedRevision: 0, input: newRoomDraft() });
    await saveRoomDraft(store, { id: second, expectedRevision: 1, input: { ...newRoomDraft(), name: "Second" } });
    await saveRoomDraft(store, { id, expectedRevision: 2, input: { ...newRoomDraft(), name: "Renamed" } });
    expect((await readDraftRegistry(store)).drafts.map(d => d.input.name)).toEqual(["Renamed", "Second"]);
  });
  it("clears obsolete purpose fields without changing the design", () => {
    const input = { ...newRoomDraft(), purpose: "legal", answers: { practice: ["Family"] }, tasks: ["Research"] };
    const next = changePurpose(input, "medical");
    expect(next.answers).toEqual({}); expect(next.tasks).toEqual([]); expect(next.templateId).toBe(input.templateId);
  });
  it("rejects injected entitlement fields and unrelated purpose answers", () => {
    expect(draftInputSchema.safeParse({ ...newRoomDraft(), paid: true }).success).toBe(false);
    expect(draftInputSchema.safeParse({ ...newRoomDraft(), purpose: "legal", answers: { specialty: ["GP"] } }).success).toBe(false);
    expect(draftInputSchema.safeParse({ ...newRoomDraft(), providers: ["openai", "openai"] }).success).toBe(false);
  });
});
