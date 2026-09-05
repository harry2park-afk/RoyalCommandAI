import { z } from "zod";

const SafeAddressSchema = z.string().trim().min(1).max(320);
const ProviderNameSchema = z.string().trim().min(1).max(64);
const ProviderRecordIdSchema = z.string().trim().min(1).max(256);

const StorageKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => !value.includes("://"), {
    message: "Store an internal storage key, not a public recording URL.",
  });

export const CommunicationScopeSchema = z.enum(["room", "legal_case"]);
export const CommunicationKindSchema = z.enum(["call", "chat"]);
export const CommunicationDirectionSchema = z.enum(["inbound", "outbound"]);
export const CommunicationChannelSchema = z.enum([
  "rc_voice",
  "pstn",
  "rc_chat",
  "sms",
  "whatsapp",
  "kakao",
]);

export const RecordingStatusSchema = z.enum([
  "not_requested",
  "blocked_by_policy",
  "pending_notice",
  "pending_consent",
  "recording",
  "recorded",
  "failed",
]);

export const TranscriptionStatusSchema = z.enum([
  "not_requested",
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const AiSummaryStatusSchema = z.enum([
  "not_requested",
  "pending",
  "processing",
  "completed",
  "failed",
]);

/**
 * Canonical server-owned communications record.
 *
 * This is deliberately provider-neutral and persistence-neutral. It establishes
 * the tenancy/Room/case linkage and lifecycle vocabulary before any database,
 * Twilio, Retell, WhatsApp, Kakao, or UI wiring is added.
 *
 * Public recording/transcript URLs are intentionally excluded. Persist only an
 * internal storage key and resolve authorised access server-side later.
 */
export const CommunicationRecordSchema = z
  .object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    roomId: z.string().uuid(),
    scope: CommunicationScopeSchema,
    caseId: z.string().uuid().nullable(),

    kind: CommunicationKindSchema,
    direction: CommunicationDirectionSchema,
    channel: CommunicationChannelSchema,

    provider: ProviderNameSchema.nullable(),
    providerRecordId: ProviderRecordIdSchema.nullable(),
    fromAddress: SafeAddressSchema,
    toAddress: SafeAddressSchema,

    startedAt: z.string().datetime({ offset: true }),
    endedAt: z.string().datetime({ offset: true }).nullable(),

    recordingStatus: RecordingStatusSchema,
    recordingPolicyReason: z.string().trim().min(1).max(80).nullable(),
    recordingPolicyVersion: z.string().trim().min(1).max(120).nullable(),
    recordingStorageKey: StorageKeySchema.nullable(),

    transcriptionStatus: TranscriptionStatusSchema,
    transcriptStorageKey: StorageKeySchema.nullable(),
    aiSummaryStatus: AiSummaryStatusSchema,

    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "legal_case" && !value.caseId) {
      ctx.addIssue({
        code: "custom",
        path: ["caseId"],
        message: "Legal-case communications must be linked to a case.",
      });
    }

    if (value.endedAt && Date.parse(value.endedAt) < Date.parse(value.startedAt)) {
      ctx.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "Communication cannot end before it starts.",
      });
    }

    if (value.recordingStatus === "recorded" && !value.recordingStorageKey) {
      ctx.addIssue({
        code: "custom",
        path: ["recordingStorageKey"],
        message: "A recorded communication requires an internal storage key.",
      });
    }

    if (value.recordingStorageKey && value.recordingStatus !== "recorded") {
      ctx.addIssue({
        code: "custom",
        path: ["recordingStorageKey"],
        message: "A recording storage key is only valid after recording is complete.",
      });
    }

    if (value.transcriptionStatus === "completed" && !value.transcriptStorageKey) {
      ctx.addIssue({
        code: "custom",
        path: ["transcriptStorageKey"],
        message: "A completed transcription requires an internal storage key.",
      });
    }

    if (value.transcriptStorageKey && value.transcriptionStatus !== "completed") {
      ctx.addIssue({
        code: "custom",
        path: ["transcriptStorageKey"],
        message: "A transcript storage key is only valid after transcription is complete.",
      });
    }
  });

export type CommunicationRecord = z.infer<typeof CommunicationRecordSchema>;
export type CommunicationScope = z.infer<typeof CommunicationScopeSchema>;
export type CommunicationKind = z.infer<typeof CommunicationKindSchema>;
export type CommunicationDirection = z.infer<typeof CommunicationDirectionSchema>;
export type CommunicationChannel = z.infer<typeof CommunicationChannelSchema>;
export type RecordingStatus = z.infer<typeof RecordingStatusSchema>;
export type TranscriptionStatus = z.infer<typeof TranscriptionStatusSchema>;
export type AiSummaryStatus = z.infer<typeof AiSummaryStatusSchema>;
