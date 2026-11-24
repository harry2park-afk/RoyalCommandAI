import { guardPaidRoom } from "@/lib/rcv3/paid-service-guard";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { orchestrateRoom } from "@/lib/ai/orchestrateRoom";
import { getAvailableProviderIds } from "@/lib/ai/connectors";
import type { AIProviderId } from "@/lib/ai/types";
import { resolveCustomerAI } from "@/lib/rcv3/customer-ai";
import { accountAnswerLanguage, answerLanguageInstruction } from "@/lib/rcv3/answer-language";
import { createClient } from "@/lib/supabase/server";
import { reserve } from "@/lib/rcv3/execution";
import { randomUUID } from "node:crypto";

export const maxDuration = 120;

const schema = z.object({
  roomId: z.string().min(1),
  message: z.string().min(1).max(12000),
  selectedLanguage: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(12000),
  })).max(16).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const data = schema.parse(await request.json());
    const entitlement = await guardPaidRoom(user.id,data.roomId,"secretary");
    if (entitlement?.onboarding && user.mode === "supabase") {
      const provider = entitlement.providers[0];
      if (!provider) return Response.json({error:"No AI provider is connected."},{status:503});
      const context={user,db:await createClient()};
      const language=await accountAnswerLanguage(context);
      const connector=await resolveCustomerAI(user.id,provider,entitlement.onboarding.aiSources[provider] || "platform");
      await reserve(context,randomUUID(),"helper");
      const result=await connector.complete({messages:[
        {role:"system",content:`You are this customer's personal AI secretary. ${answerLanguageInstruction(language)} Answer directly. You cannot send, call, book or pay through this chat. Never claim actions you have not performed.`},
        ...(data.history || []), {role:"user",content:data.message},
      ],maxTokens:1500});
      if(result.error || !result.content.trim())return Response.json({error:"Your selected AI could not answer. Check its connection and retry."},{status:503});
      return Response.json({answer:result.content,provider});
    }
    const available = getAvailableProviderIds().filter(id=>!entitlement||entitlement.providers.includes(id));
    const preferred = (["openai", "anthropic", "google", "xai"] as AIProviderId[])
      .find((id) => available.includes(id)) || available[0];

    if (!preferred) return Response.json({ error: "No AI provider is connected." }, { status: 503 });

    const selectedLanguage = data.selectedLanguage || user.defaultLanguage || "en";
    const instruction = [
      "You are Royal Command AI Helper, a concise and friendly general-purpose assistant inside the Royal Command interface.",
      "Answer any reasonable question the user asks, not only Royal Command questions.",
      "LANGUAGE RULE: the user's actual latest message language always has priority over the UI-selected language.",
      "If the latest message is English, answer in English even if the UI language is Chinese, Korean, or another language.",
      "If the latest message is Chinese, answer in Chinese; Korean in Korean; Japanese in Japanese; and likewise for other languages.",
      "Use the UI-selected language only for greetings, placeholders, or when the user's language is genuinely ambiguous.",
      `Current UI-selected language hint: ${selectedLanguage}.`,
      "Keep answers practical and reasonably short. For Royal Command screen questions, explain the current feature clearly. Do not claim to have performed an action unless it was actually performed.",
      "User message follows:",
      data.message,
    ].join("\n");

    const result = await orchestrateRoom(data.roomId, {
      prompt: instruction,
      history: data.history,
      language: selectedLanguage,
      providers: [preferred],
    });

    const response = result.responses.find((item) => item.provider === preferred);
    const answer = response?.content?.trim() || result.finalAnswer?.trim();
    if (!answer) return Response.json({ error: response?.error || "AI Helper returned no answer." }, { status: 502 });

    return Response.json({ answer, provider: preferred });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid AI Helper request." }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "AI Helper failed." }, { status: 500 });
  }
}
