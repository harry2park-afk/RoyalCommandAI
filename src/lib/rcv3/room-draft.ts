import { z } from "zod";
import { ROOM_TEMPLATES } from "@/lib/rooms/templates";
import { AI_PROVIDER_IDS } from "@/lib/ai/types";
import { roomTemplates } from "./templates";
import type { CloudStore } from "./cloud-state";

// Reuse the existing catalogue. Headcount, atmosphere and customer type do not
// affect this flow and must not become mandatory onboarding questions.
export const roomPurposes = ROOM_TEMPLATES.map(p => ({ ...p,
  fields: [
    ...p.fields.filter(f => !["team", "customer", "scope"].includes(f.id)),
    ...(p.id === "legal" ? [
      {id:"legalAiPriority",label:"Legal AI priority",options:["Highest available reasoning", "Balanced speed and quality", "Use my connected AI"]},
      {id:"customRequest",label:"Customer's requested legal capability"},
      {id:"advancedRequests",label:"Advanced legal requests",options:["Case timeline", "Evidence organisation", "Document comparison", "Contract review", "Citation research", "Client intake summary", "Deadline tracking", "Bilingual drafts", "Jurisdiction and source checks", "Conflicting evidence review", "Privilege and confidentiality review", "Court filing checklist"]},
    ] : []),
  ],
}));
export const draftInputSchema = z.object({
  name: z.string().trim().max(80),
  brief: z.string().trim().max(300).optional(),
  purpose: z.string().refine(id => roomPurposes.some(p => p.id === id)),
  answers: z.record(z.string().max(80), z.array(z.string().trim().min(1).max(300)).max(12)),
  tasks: z.array(z.string().max(120)).max(12),
  providers: z.array(z.enum(AI_PROVIDER_IDS)).max(27),
  // Optional for compatibility with already signed orders. Never add defaults
  // while parsing old snapshots: that would change their payment fingerprint.
  onboarding: z.object({
    country: z.string().regex(/^(?:[A-Z]{2})?$/),
    aiSources: z.partialRecord(z.enum(AI_PROVIDER_IDS), z.enum(["platform", "personal"])),
    emailEnabled: z.boolean(),
    phoneRequested: z.boolean().optional(),
    phoneNumberId: z.string().regex(/^(?:PN[a-fA-F0-9]{32})?$/).optional(),
    phoneConsent: z.boolean().optional(),
    phoneOfferId: z.union([z.literal(""), z.string().uuid()]),
  }).strict().optional(),
  secretary: z.boolean(),
  secretarySetup: z.object({
    email: z.string().trim().max(254),
    phone: z.string().trim().max(40),
  }).strict().default({ email: "", phone: "" }),
  specialAI: z.boolean(),
  plan: z.enum(["free", "paid"]),
  templateId: z.string().refine(id => roomTemplates.some(t => t.id === id)),
  step: z.number().int().min(0).max(3),
}).strict().superRefine((d, ctx) => {
  const purpose = roomPurposes.find(p => p.id === d.purpose);
  if (!purpose) return;
  const allowed = new Set(purpose.fields.map(f => f.id));
  const invalidAnswers = purpose.fields.some(field => {
    const values = d.answers[field.id] || [];
    return new Set(values).size !== values.length || (field.options
      ? values.some(value => !field.options!.includes(value))
      : values.length > 1);
  });
  if (invalidAnswers || Object.keys(d.answers).some(key => !allowed.has(key)) ||
      Object.keys(d.onboarding?.aiSources || {}).some(id => !d.providers.includes(id as typeof d.providers[number])) ||
      (!d.secretary && (d.onboarding?.emailEnabled || d.onboarding?.phoneOfferId || d.onboarding?.phoneRequested || d.onboarding?.phoneNumberId || d.onboarding?.phoneConsent)) ||
      d.tasks.some(t => !purpose.suggestedAgents.includes(t)) ||
      new Set(d.providers).size !== d.providers.length || new Set(d.tasks).size !== d.tasks.length) {
    ctx.addIssue({ code: "custom", message: "INVALID_ROOM_SELECTION" });
  }
});
export type RoomDraftInput = z.infer<typeof draftInputSchema>;
export function secretarySetupValid(input: RoomDraftInput) {
  if (!input.secretary) return true;
  if (input.onboarding) return z.email().safeParse(input.secretarySetup.email.trim()).success &&
    (!input.secretarySetup.phone.trim() || /^\+[1-9]\d{6,14}$/.test(input.secretarySetup.phone.replace(/[\s().-]/g, "")));
  return z.email().safeParse(input.secretarySetup.email.trim()).success &&
    /^\+[1-9]\d{6,14}$/.test(input.secretarySetup.phone.replace(/[\s().-]/g, ""));
}
export function selectSecretary(input: RoomDraftInput, enabled: boolean): RoomDraftInput {
  return { ...input, secretary: enabled, secretarySetup: enabled ? input.secretarySetup : { email: "", phone: "" },
    ...(input.onboarding ? {onboarding: {...input.onboarding, emailEnabled: enabled && input.onboarding.emailEnabled, phoneRequested: enabled && input.onboarding.phoneRequested, phoneOfferId: enabled ? input.onboarding.phoneOfferId : "", phoneNumberId: enabled ? input.onboarding.phoneNumberId : "", phoneConsent: enabled && input.onboarding.phoneConsent}} : {}) };
}
const draftSchema = z.object({
  id: z.string().uuid(), updatedAt: z.string().datetime(), input: draftInputSchema,
}).strict();
export type RoomDraft = z.infer<typeof draftSchema>;
const registrySchema = z.object({
  revision: z.number().int().min(0).max(9999999999),
  drafts: z.array(draftSchema).max(100),
}).strict();
export type DraftRegistry = z.infer<typeof registrySchema>;
export const draftUpdateSchema = z.object({
  id: z.string().uuid(), expectedRevision: z.number().int().min(0).max(9999999998), input: draftInputSchema,
}).strict();
export function newRoomDraft(): RoomDraftInput {
  return { name: "", purpose: "custom", answers: {}, tasks: [], providers: [],
    secretary: false, secretarySetup: { email: "", phone: "" }, specialAI: false, plan: "paid", templateId: roomTemplates[0].id, step: 0 };
}
export function changePurpose(input: RoomDraftInput, purpose: string): RoomDraftInput {
  return { ...input, purpose, answers: {}, tasks: [] };
}
const file = (revision: number) => `drafts/${String(revision).padStart(10, "0")}.txt`;
export async function readDraftRegistry(store: CloudStore): Promise<DraftRegistry> {
  const files = await store.list("drafts", 1);
  if (!files.length) return { revision: 0, drafts: [] };
  if (!/^\d{10}\.txt$/.test(files[0].name)) throw new Error("RCV3_STORAGE");
  const value = registrySchema.parse(await store.read(`drafts/${files[0].name}`));
  if (file(value.revision) !== `drafts/${files[0].name}`) throw new Error("RCV3_STORAGE");
  return value;
}
export async function saveRoomDraft(store: CloudStore, candidate: unknown): Promise<DraftRegistry> {
  const update = draftUpdateSchema.parse(candidate);
  // A disabled secretary cannot retain hidden contact data in the current draft.
  if (!update.input.secretary) update.input.secretarySetup = { email: "", phone: "" };
  const current = await readDraftRegistry(store);
  if (current.revision !== update.expectedRevision) throw new Error("RCV3_CONFLICT");
  if (current.drafts.length >= 100 && !current.drafts.some(d => d.id === update.id)) throw new Error("RCV3_LIMIT");
  const next = registrySchema.parse({ revision: current.revision + 1, drafts: [
    { id: update.id, input: update.input, updatedAt: new Date().toISOString() },
    ...current.drafts.filter(d => d.id !== update.id),
  ] });
  // Insert-only revisions provide compare-and-swap even across server instances.
  // Draft data never grants payment or AI entitlements.
  if (new TextEncoder().encode(JSON.stringify(next)).byteLength > 1400000) throw new Error("RCV3_LIMIT");
  await store.insert(file(next.revision), next);
  return next;
}
