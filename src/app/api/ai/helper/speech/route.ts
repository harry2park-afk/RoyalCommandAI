import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

export const maxDuration = 30;

const schema = z.object({
  text: z.string().min(1).max(4000),
  language: z.string().optional(),
  greeting: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const key = process.env.OPENAI_API_KEY;
    if (!key) return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });

    const data = schema.parse(await request.json());
    const language = data.language || user.defaultLanguage || "en";
    const instructions = data.greeting
      ? [
          "Speak as a warm, bright young adult woman in her twenties.",
          "Sound genuinely happy to meet the customer, with a smile clearly audible in the voice.",
          "Use a light, elegant, friendly concierge tone — youthful, polished, natural, never childish.",
          "Begin with a subtle cheerful lift, as if smiling while greeting someone in person.",
          "Do not sound elderly, stern, robotic, theatrical, or overly formal.",
          `Speak naturally in the language of the text. UI language hint: ${language}.`,
        ].join(" ")
      : [
          "Speak as a natural young adult woman in her twenties.",
          "Use a warm, friendly, elegant Royal Command concierge tone with a gentle smile.",
          "Keep the delivery conversational, clear, lively and human, not elderly, robotic or overly formal.",
          `Speak naturally in the language of the text. UI language hint: ${language}.`,
        ].join(" ");

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: data.text,
        instructions,
        response_format: "mp3",
        speed: data.greeting ? 1.04 : 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return Response.json({ error: errorText || `Speech API HTTP ${response.status}` }, { status: 502 });
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid speech request" }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "Speech generation failed" }, { status: 500 });
  }
}
