import { describe, expect, it } from "vitest";
import { CommunicationRecordSchema } from "./communicationRecord";

const baseRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  ownerId: "22222222-2222-4222-8222-222222222222",
  roomId: "33333333-3333-4333-8333-333333333333",
  scope: "room" as const,
  caseId: null,
  kind: "call" as const,
  direction: "outbound" as const,
  channel: "pstn" as const,
  provider: "twilio",
  providerRecordId: "CA-example",
  fromAddress: "+61200000000",
  toAddress: "+61400000000",
  startedAt: "2026-08-29T10:00:00Z",
  endedAt: null,
  recordingStatus: "blocked_by_policy" as const,
  recordingPolicyReason: "NO_APPROVED_POLICY",
  recordingPolicyVersion: null,
  recordingStorageKey: null,
  transcriptionStatus: "not_requested" as const,
  transcriptStorageKey: null,
  aiSummaryStatus: "not_requested" as const,
  createdAt: "2026-08-29T10:00:00Z",
  updatedAt: "2026-08-29T10:00:00Z",
};

describe("communications record domain", () => {
  it("accepts a provider-neutral Room call record", () => {
    expect(CommunicationRecordSchema.parse(baseRecord)).toEqual(baseRecord);
  });

  it("requires a case id for legal-case communications", () => {
    const result = CommunicationRecordSchema.safeParse({
      ...baseRecord,
      scope: "legal_case",
      caseId: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "caseId")).toBe(true);
    }
  });

  it("accepts an explicitly case-linked legal communication", () => {
    const result = CommunicationRecordSchema.safeParse({
      ...baseRecord,
      scope: "legal_case",
      caseId: "44444444-4444-4444-8444-444444444444",
    });

    expect(result.success).toBe(true);
  });

  it("rejects public recording URLs in favour of internal storage keys", () => {
    const result = CommunicationRecordSchema.safeParse({
      ...baseRecord,
      recordingStatus: "recorded",
      recordingStorageKey: "https://example.com/recording.mp3",
    });

    expect(result.success).toBe(false);
  });

  it("requires a storage key when a recording is marked recorded", () => {
    const result = CommunicationRecordSchema.safeParse({
      ...baseRecord,
      recordingStatus: "recorded",
      recordingStorageKey: null,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a completed recording with an internal storage key", () => {
    const result = CommunicationRecordSchema.safeParse({
      ...baseRecord,
      recordingStatus: "recorded",
      recordingStorageKey: "communications/11111111-1111-4111-8111-111111111111/audio.enc",
    });

    expect(result.success).toBe(true);
  });

  it("requires a transcript storage key when transcription is completed", () => {
    const result = CommunicationRecordSchema.safeParse({
      ...baseRecord,
      transcriptionStatus: "completed",
      transcriptStorageKey: null,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an end time before the start time", () => {
    const result = CommunicationRecordSchema.safeParse({
      ...baseRecord,
      endedAt: "2026-08-29T09:59:59Z",
    });

    expect(result.success).toBe(false);
  });

  it("supports future official messenger adapters without changing tenancy linkage", () => {
    for (const channel of ["rc_chat", "sms", "whatsapp", "kakao"] as const) {
      const result = CommunicationRecordSchema.safeParse({
        ...baseRecord,
        kind: "chat",
        channel,
        provider: null,
        providerRecordId: null,
      });
      expect(result.success, channel).toBe(true);
    }
  });
});
