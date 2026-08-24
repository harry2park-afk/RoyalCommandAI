import { z } from "zod";
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

const workContinuationPrompt = z.string().min(1).max(60000).transform((prompt) => {
  const hasWorkId = /\bRC-\d{8}(?:-[A-Z0-9]+)+\b/i.test(prompt);
  const asksToContinueExecution = /(실행해(?:\s*줘|\s*주세요)?|실행하세요|계속해(?:\s*줘|\s*주세요)?|계속하세요|이어(?:서)?\s*(?:해|하세요|진행해|진행하세요)|진행해(?:\s*줘|\s*주세요)?|진행하세요|고쳐(?:\s*줘|\s*주세요)?|수정해(?:\s*줘|\s*주세요)?|반영해(?:\s*줘|\s*주세요)?|구현해(?:\s*줘|\s*주세요)?)/i.test(prompt);
  const alreadyHasDevSubject = /(코드|개발|버그|오류|ui|화면|레이아웃|사이드바|버튼|기능|파일|github|commit|push|merge|배포|vercel|component|tsx|typescript|css|시스템|라우팅|api|웹사이트|홈페이지|페이지|앱|agent|에이전트)/i.test(prompt);

  if (hasWorkId && asksToContinueExecution && !alreadyHasDevSubject) {
    return `${prompt}\n\n[ROYAL COMMAND HOST ROUTING: 기존 Work ID의 개발 코드 작업을 계속 실행]`;
  }
  return prompt;
});

export const chatSchema = z.object({
  roomId: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  prompt: workContinuationPrompt,
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

export const translateSchema = z.object({
  text: z.string().min(1).max(20000),
  targetLanguage: z.string().min(2).max(12),
  sourceLanguage: z.string().min(2).max(12).optional(),
});
