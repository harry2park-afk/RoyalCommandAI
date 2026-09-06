import { getConnector } from "@/lib/ai/connectors";
import { buildSynthesisPrompt, type ValidatedSynthesisRequest } from "@/lib/ai/synthesisRequest";
import type { AIProviderResponse } from "@/lib/ai/types";

const RCA_COMMAND_ROOM_ID = "89fe50fc-12bf-4fa0-8da8-aff065bae960";

export type RcCommandCenterSynthesisResult = {
  attempted: boolean;
  finalAnswer: string;
  sourceCount: number;
  error?: string;
};

export async function synthesizeRcCommandCenterAnswer(input: {
  roomId: string;
  originalPrompt: string;
  language: string;
  responses: AIProviderResponse[];
}): Promise<RcCommandCenterSynthesisResult> {
  if (input.roomId !== RCA_COMMAND_ROOM_ID) {
    return { attempted: false, finalAnswer: "", sourceCount: 0 };
  }

  const usable = input.responses
    .filter((item) => !item.error && item.content.trim().length > 1)
    .map((item) => ({ provider: item.provider, content: item.content.trim(), latencyMs: item.latencyMs }));

  if (usable.length < 2) {
    return {
      attempted: false,
      finalAnswer: usable[0]?.content || "",
      sourceCount: usable.length,
      ...(usable.length ? {} : { error: "No complete AI answers were available for synthesis." }),
    };
  }

  try {
    const request: ValidatedSynthesisRequest = {
      roomId: input.roomId,
      originalPrompt: input.originalPrompt,
      language: input.language,
      synthesizer: "openai",
      responses: usable,
    };
    const connector = getConnector("openai");
    if (!connector.isConfigured()) {
      return { attempted: true, finalAnswer: "", sourceCount: usable.length, error: "ChatGPT synthesis provider is not configured." };
    }

    const response = await connector.complete({
      messages: [
        {
          role: "system",
          content: [
            "You are ChatGPT acting only as Royal Command Controller / Final Integrator.",
            "Synthesize the independent AI answers into one final answer for Harry.",
            "Do not invent tool evidence, consensus, successful execution, commits, tests, or deployment status.",
            "Preserve material disagreements and failed/missing evidence.",
            "Return the final integrated answer only; do not repeat all source answers in full.",
          ].join(" "),
        },
        { role: "user", content: buildSynthesisPrompt(request) },
      ],
      temperature: 0.15,
      maxTokens: 6000,
    });

    if (response.error || !response.content.trim()) {
      return {
        attempted: true,
        finalAnswer: "",
        sourceCount: usable.length,
        error: response.error || "ChatGPT returned no synthesis answer.",
      };
    }

    return {
      attempted: true,
      finalAnswer: response.content.trim(),
      sourceCount: usable.length,
    };
  } catch (error) {
    return {
      attempted: true,
      finalAnswer: "",
      sourceCount: usable.length,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
