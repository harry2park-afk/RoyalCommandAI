import { z } from "zod";
import { RC_MEMBER_PROVIDER_IDS, resolveRcMemberCommand } from "@/lib/ai/rcMemberLayer";
import { AI_PROVIDER_IDS, type AIProviderId } from "@/lib/ai/types";
import { resolveRoomRouteId } from "@/lib/rooms/resolve-room-id";

const RCA_COMMAND_ROOM_ID = "89fe50fc-12bf-4fa0-8da8-aff065bae960";

const RCA_SINGLE_PROVIDER_NAMES: Array<{ id: AIProviderId; names: string[] }> = [
  { id: "openai", names: ["chatgpt", "챗지피티", "챗gpt"] },
  { id: "anthropic", names: ["claude", "클로드"] },
  { id: "google", names: ["gemini", "제미니"] },
  { id: "xai", names: ["grok", "그록"] },
  { id: "codex", names: ["codex", "코덱스"] },
];

function explicitRcaSingleProvider(prompt: string): AIProviderId | null {
  const lower = prompt.toLowerCase();
  const onlyIntent = /(?:만\s*(?:답|응답)|only\s+(?:answer|respond)|(?:answer|respond)\s+only)/i.test(prompt);
  if (!onlyIntent) return null;
  for (const item of RCA_SINGLE_PROVIDER_NAMES) {
    if (item.names.some((name) => lower.includes(name))) return item.id;
  }
  return null;
}

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(120),
  defaultLanguage: z.string().min(2).max(12).default("en"),
  countryCode: z.string().length(2),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createRoomSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  householdId: z.string().uuid().optional(),
});

const chatInputSchema = z.object({
  roomId: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  prompt: z.string().min(1).max(60000),
  language: z.string().min(2).max(12).optional(),
  providers: z.array(z.enum(AI_PROVIDER_IDS)).optional(),
  modelSelections: z.record(z.enum(AI_PROVIDER_IDS), z.string().min(3).max(160)).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }),
    )
    .optional(),
}).refine(
  (data) => Boolean(data.providers?.length || Object.keys(data.modelSelections || {}).length),
  {
    message: "Select at least one connected AI before sending the request.",
    path: ["providers"],
  },
);

export const chatSchema = chatInputSchema.transform((data) => {
  const roomId = resolveRoomRouteId(data.roomId);
  const isRcaCommandCenter = roomId === RCA_COMMAND_ROOM_ID;
  const fixedTeam = isRcaCommandCenter ? [...RC_MEMBER_PROVIDER_IDS] : data.providers;
  const initialCommand = resolveRcMemberCommand(data.prompt, data.history, fixedTeam);
  const explicitSingle = isRcaCommandCenter && initialCommand.mode !== "execute"
    ? explicitRcaSingleProvider(data.prompt)
    : null;
  const selectedProviders = explicitSingle ? [explicitSingle] : fixedTeam;
  const memberCommand = explicitSingle
    ? resolveRcMemberCommand(data.prompt, data.history, selectedProviders)
    : initialCommand;

  return {
    ...data,
    roomId,
    providers: memberCommand.leadProviders.length ? memberCommand.leadProviders : selectedProviders,
    memberCommand,
  };
});

export const translateSchema = z.object({
  text: z.string().min(1).max(20000),
  targetLanguage: z.string().min(2).max(12),
  sourceLanguage: z.string().min(2).max(12).optional(),
});
