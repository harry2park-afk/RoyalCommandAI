import { z } from "zod";
import { resolveRcMemberCommand } from "@/lib/ai/rcMemberLayer";
import { AI_PROVIDER_IDS } from "@/lib/ai/types";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(120),
  defaultLanguage: z.string().min(2).max(12).default("en"),
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
});

export const chatSchema = chatInputSchema.transform((data) => {
  const memberCommand = resolveRcMemberCommand(data.prompt, data.history, data.providers);
  return {
    ...data,
    providers: memberCommand.leadProviders.length ? memberCommand.leadProviders : data.providers,
    memberCommand,
  };
});

export const translateSchema = z.object({
  text: z.string().min(1).max(20000),
  targetLanguage: z.string().min(2).max(12),
  sourceLanguage: z.string().min(2).max(12).optional(),
});
