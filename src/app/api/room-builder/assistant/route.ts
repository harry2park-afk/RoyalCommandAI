import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProviderIds } from "@/lib/ai/connectors";
import { orchestrate } from "@/lib/ai/orchestrator";
import type { AIProviderId } from "@/lib/ai/types";

export const maxDuration = 60;

const schema = z.object({
  message: z.string().min(1).max(4000),
  selectedLanguage: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  })).max(12).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const data = schema.parse(await request.json());
    const available = getAvailableProviderIds();
    const preferred = (["openai", "anthropic", "google", "xai"] as AIProviderId[])
      .find((id) => available.includes(id)) || available[0];

    if (!preferred) return Response.json({ error: "No AI provider is connected." }, { status: 503 });

    const instruction = [
      "You are the Royal Command Room Builder Guide.",
      "Understand the user's natural-language request, including Korean, even when wording is informal or conversational.",
      "Your job is to help the user build or edit a Room. Answer the actual meaning of what the user said; do not give unrelated canned guidance.",
      "If the user asks a question, answer it directly and briefly.",
      "If the user asks to change a Room Builder field but you cannot directly operate that field from this API, explain exactly what should be selected or entered next. Never claim a field was changed unless the client-side form logic actually did it.",
      "LANGUAGE RULE: respond in the language used in the user's latest message. Korean message -> Korean response; English message -> English response.",
      `UI language hint: ${data.selectedLanguage || user.defaultLanguage || "en"}.`,
      "Keep the answer concise, practical, and specific to the Room Builder screen.",
      "User message:",
      data.message,
    ].join("\n");

    const result = await orchestrate({
      prompt: instruction,
      history: data.history,
      language: data.selectedLanguage || user.defaultLanguage || "en",
      providers: [preferred],
    });

    const response = result.responses.find((item) => item.provider === preferred);
    const answer = response?.content?.trim() || result.finalAnswer?.trim();
    if (!answer) return Response.json({ error: response?.error || "Room Builder AI returned no answer." }, { status: 502 });

    return Response.json({ answer, provider: preferred });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid Room Builder assistant request." }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "Room Builder assistant failed." }, { status: 500 });
  }
}
