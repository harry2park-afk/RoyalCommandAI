import { z } from "zod";
import { appearanceLimits as limits } from "./appearance-limits";
import { AI_PROVIDER_IDS } from "@/lib/ai/types";
import type { createClient } from "@/lib/supabase/server";
import { validateDesign } from "../../../rcv3/core.mjs";

type DB = Awaited<ReturnType<typeof createClient>>;
export const capability = z.enum(["chat", "secretary", "files"]);
export const buttonSchema = z.object({
  id: z.string().uuid().transform(v => v.toLowerCase()), capability,
  label: z.string().min(1).max(80), x: z.number(), y: z.number(),
  width: z.number(), height: z.number(), opacity: z.number(),
}).strict();
export const designSchema = z.object({
  backgroundAssetId: z.string().uuid().nullable(), buttons: z.array(buttonSchema).max(32),
}).strict().superRefine((value, ctx) => {
  try { validateDesign(value); } catch { ctx.addIssue({ code: "custom", message: "INVALID_DESIGN" }); }
});
const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const appearanceSchema = z.object({
  color: colour.default("#ffffff"), background: colour.default("#172a41"),
  borderColor: colour.default("#64748b"), borderWidth: z.number().min(limits.borderWidth.min).max(limits.borderWidth.max).default(limits.borderWidth.default),
  radius: z.number().min(limits.radius.min).max(limits.radius.max).default(limits.radius.default), fontSize: z.number().min(limits.fontSize.min).max(limits.fontSize.max).default(limits.fontSize.default),
}).strict();
export const stateSchema = z.object({
  revision: z.number().int().min(1).max(9999999999),
  release: z.literal("rcv3-1"), name: z.string().trim().min(1).max(80),
  connectedProviders: z.array(z.enum(AI_PROVIDER_IDS)).max(27).default(["openai"]),
  selectedProviders: z.array(z.enum(AI_PROVIDER_IDS)).max(27).default(["openai"]),
  providerOrder: z.array(z.enum(AI_PROVIDER_IDS)).max(27).refine(ids=>new Set(ids).size===ids.length, "DUPLICATE_PROVIDER_ORDER").optional(),
  secretaryRoomId: z.string().uuid().nullable().default(null),
  gmailEnabled: z.boolean().default(false),
  design: designSchema,
  appearances: z.record(z.string().uuid(), appearanceSchema),
  bindings: z.record(z.string().uuid(), capability),
}).strict().superRefine((state, ctx) => {
  if(new Set(state.connectedProviders).size!==state.connectedProviders.length || new Set(state.selectedProviders).size!==state.selectedProviders.length || state.selectedProviders.some(id=>!state.connectedProviders.includes(id))) ctx.addIssue({code:"custom",message:"INVALID_PROVIDER_SELECTION"});
  for (const button of state.design.buttons) {
    if (state.bindings[button.id] !== button.capability) ctx.addIssue({ code: "custom", message: "CAPABILITY_LOCKED" });
  }
});
export type CloudState = z.infer<typeof stateSchema>;
export type Design = z.infer<typeof designSchema>;
export type Button = z.infer<typeof buttonSchema>;

export function evolveState(previous: CloudState, candidate: unknown, expectedRevision: number): CloudState {
  if (previous.revision !== expectedRevision) throw new Error("RCV3_CONFLICT");
  const next = stateSchema.parse(candidate);
  if (next.revision !== previous.revision + 1) throw new Error("RCV3_CONFLICT");
  // Bindings survive removal. The client cannot erase or reassign an old identity.
  for (const [id, value] of Object.entries(previous.bindings)) {
    if (next.bindings[id] !== value) throw new Error("RCV3_CAPABILITY_LOCKED");
  }
  return next;
}

export function cloudStore(db: DB, ownerId: string, roomId: string) {
  const owner = z.string().uuid().parse(ownerId).toLowerCase();
  const room = z.string().uuid().parse(roomId).toLowerCase();
  const bucket = db.storage.from("matter-documents");
  const root = `${owner}/${room}/rcv3-v1`;
  function path(value: string) {
    if (!/^[a-z0-9/-]+\.txt$/.test(value) || value.includes("..")) throw new Error("RCV3_PATH");
    return `${root}/${value}`;
  }
  return {
    async list(folder: string, limit = 50) {
      if (!/^[a-z0-9/-]+$/.test(folder)) throw new Error("RCV3_PATH");
      const result = await bucket.list(`${root}/${folder}`, { limit, sortBy: { column: "name", order: "desc" } });
      if (result.error) throw new Error("RCV3_STORAGE");
      return result.data ?? [];
    },
    async read(key: string) {
      const result = await bucket.download(path(key));
      if (result.error || !result.data || result.data.size > 1500000) throw new Error("RCV3_STORAGE");
      return JSON.parse(await result.data.text()) as unknown;
    },
    async insert(key: string, value: unknown) {
      const body = JSON.stringify(value);
      if (body.length > 1500000) throw new Error("RCV3_SIZE");
      const result = await bucket.upload(path(key), body, { upsert: false, contentType: "text/plain", cacheControl: "0" });
      if (result.error) throw new Error(/duplicate|already exists/i.test(result.error.message) ? "RCV3_CONFLICT" : "RCV3_STORAGE");
    },
  };
}
export type CloudStore = ReturnType<typeof cloudStore>;
export const revisionFile = (revision: number) => `state/${String(revision).padStart(10, "0")}.txt`;
export async function readState(store: CloudStore) {
  const files = await store.list("state", 1);
  if (!files.length) return null;
  if (!/^\d{10}\.txt$/.test(files[0].name)) throw new Error("RCV3_STORAGE");
  const state = stateSchema.parse(await store.read(`state/${files[0].name}`));
  if (revisionFile(state.revision) !== `state/${files[0].name}`) throw new Error("RCV3_STORAGE");
  return state;
}
export async function writeState(store: CloudStore, expectedRevision: number, candidate: unknown) {
  const previous = await readState(store);
  if (!previous) throw new Error("RCV3_NOT_FOUND");
  const state = evolveState(previous, candidate, expectedRevision);
  await store.insert(revisionFile(state.revision), state);
  return state;
}
