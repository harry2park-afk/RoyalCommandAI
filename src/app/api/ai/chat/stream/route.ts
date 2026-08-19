import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { orchestrateRoom } from "@/lib/ai/orchestrateRoom";
import { getAvailableProviderIds } from "@/lib/ai/connectors";
import type { AIModelId } from "@/lib/ai/modelRegistry";
import { synthesizeBestAnswer } from "@/lib/ai/synthesize";
import type { AIProviderId, AIProviderResponse } from "@/lib/ai/types";
import { PROVIDER_LABELS } from "@/lib/ai/types";
import { chatSchema } from "@/lib/validations";
import { localDb } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const maxDuration = 240;

const DEV_PROVIDER_NAMES: Partial<Record<AIProviderId, string>> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
};

const PROVIDER_MENTIONS: Array<{ id: AIProviderId; pattern: RegExp }> = [
  { id: "openai", pattern: /(chatgpt|openai|챗지피티|챗GPT)/i },
  { id: "anthropic", pattern: /(claude|클로드)/i },
  { id: "google", pattern: /(gemini|제미나이)/i },
  { id: "xai", pattern: /(grok|그록)/i },
];

function hasExplicitNoExecutionIntent(prompt: string) {
  const explicitNegation = /(실행|수정|변경|구현|배포|개발\s*(?:agent|에이전트)|코드|파일|github|commit|push|merge).{0,30}(?:하지\s*마|하지\s*말|하지\s*않|금지|요청(?:하는\s*것)?이\s*아니|요청하지\s*않)/i.test(prompt);
  const explanationOnly = /(설명|분석|진단|검토|테스트|의견|원인|답변).{0,8}(?:만\s*(?:해|하세요|해주세요|줘|주세요)|목적|용도)/i.test(prompt);
  const noActionStatement = /(실제|실제로).{0,12}(?:코드|파일|github|vercel|배포|개발\s*(?:agent|에이전트)).{0,18}(?:변경|실행|수정|배포).{0,10}(?:하지\s*않|안\s*했|하지\s*마)/i.test(prompt);
  return explicitNegation || explanationOnly || noActionStatement;
}

function shouldRunDeveloperAgent(prompt: string) {
  if (hasExplicitNoExecutionIntent(prompt)) return false;
  const subject = /(코드|개발|버그|오류|ui|화면|레이아웃|사이드바|버튼|기능|파일|github|commit|push|merge|배포|vercel|component|tsx|typescript|css|시스템|라우팅|api|웹사이트|홈페이지|페이지|앱|agent|에이전트)/i.test(prompt);
  const action = /(수정해(?:\s*줘|\s*주세요)?|수정하세요|고쳐(?:\s*줘|\s*주세요)?|고치세요|변경해(?:\s*줘|\s*주세요)?|바꿔(?:\s*줘|\s*주세요)?|교체해(?:\s*줘|\s*주세요)?|반영해(?:\s*줘|\s*주세요)?|반영하세요|적용해(?:\s*줘|\s*주세요)?|구현해(?:\s*줘|\s*주세요)?|구현하세요|만들어(?:\s*줘|\s*주세요)?|만드세요|추가해(?:\s*줘|\s*주세요)?|추가하세요|넣어(?:\s*줘|\s*주세요)?|붙여\s*넣어(?:\s*줘|\s*주세요)?|삭제해(?:\s*줘|\s*주세요)?|삭제하세요|제거해(?:\s*줘|\s*주세요)?|배포해(?:\s*줘|\s*주세요)?|배포하세요|실행해(?:\s*줘|\s*주세요)?|실행하세요|commit\b|push\b|merge\b|코드를\s*(?:써|작성|변경|수정)|파일을\s*(?:생성|수정|변경|삭제)|실제로\s*(?:수정|변경|구현|배포|실행))/i.test(prompt);
  return subject && action;
}

function resolvePromptProviders(prompt: string, selected?: AIProviderId[]) {
  const selectedProviders = (selected || []).filter((id) => Boolean(DEV_PROVIDER_NAMES[id]));
  const asksForAll = /(모두|전부|전체|다 같이|다같이|all\s+(ais?|models?|providers?)|everyone)/i.test(prompt)
    && /(답|말|의견|응답|answer|respond|reply|opinion)/i.test(prompt);
  if (asksForAll) return selectedProviders.length ? selectedProviders : undefined;

  const exclusive = /(만\s*(답|말|응답|의견|해|하세요|해주세요)|만\s*$|only|just\s+(?:have\s+)?|다른\s*(ai|에이아이|모델).*?(말하지|답하지|응답하지)|나머지.*?(말하지|답하지|응답하지))/i.test(prompt);
  if (!exclusive) return selectedProviders.length ? selectedProviders : undefined;

  const named = PROVIDER_MENTIONS
    .filter(({ pattern }) => pattern.test(prompt))
    .map(({ id }) => id);
  return named.length ? named : (selectedProviders.length ? selectedProviders : undefined);
}

function validResponse(response?: AIProviderResponse) {
  return Boolean(response && !response.error && response.content.trim().length > 1);
}

async function runProviderWithOneRetry(
  roomId: string,
  provider: AIProviderId,
  input: {
    prompt: string;
    history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    language?: string;
    modelSelections?: Partial<Record<AIProviderId, AIModelId>>;
  },
) {
  let result = await orchestrateRoom(roomId, { ...input, providers: [provider] });
  let response = result.responses.find((item) => item.provider === provider);
  let retried = false;

  if (!result.blocked && !validResponse(response)) {
    retried = true;
    logger.warn("chat.stream.provider_retry", { roomId, provider, reason: response?.error || "empty response" });
    result = await orchestrateRoom(roomId, { ...input, providers: [provider] });
    response = result.responses.find((item) => item.provider === provider);
  }

  return { result, response, retried };
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const sendLine = (controller: ReadableStreamDefaultController<Uint8Array>, value: unknown) => {
    controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
  };

  try {
    const user = await getCurrentUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const body = await request.json();
    const data = chatSchema.parse(body);
    const language = data.language || user.defaultLanguage;
    const modelSelections = data.modelSelections as Partial<Record<AIProviderId, AIModelId>> | undefined;
    const routed = resolvePromptProviders(data.prompt, data.providers as AIProviderId[] | undefined);

    if (shouldRunDeveloperAgent(data.prompt)) {
      const cookie = request.headers.get("cookie") || "";
      const legacy = await fetch(new URL("/api/ai/chat", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify(data),
        cache: "no-store",
      });
      const payload = await legacy.json();
      if (!legacy.ok) return new Response(JSON.stringify(payload), { status: legacy.status, headers: { "Content-Type": "application/json" } });
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          sendLine(controller, { type: "final", result: payload, legacyDevelopment: true });
          controller.close();
        },
      });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
    }

    const available = new Set(getAvailableProviderIds());
    const modelSelectedProviders = Object.keys(modelSelections || {}) as AIProviderId[];
    const requestedProviders = routed?.length
      ? routed
      : modelSelectedProviders.length
        ? modelSelectedProviders
        : getAvailableProviderIds();
    const providers = requestedProviders.filter((id) => available.has(id));
    const started = Date.now();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        void (async () => {
          if (!providers.length) {
            sendLine(controller, { type: "error", error: "No selected AI is connected." });
            controller.close();
            return;
          }

          const responsesByProvider = new Map<AIProviderId, AIProviderResponse>();
          let blockedResult: Awaited<ReturnType<typeof orchestrateRoom>> | null = null;

          await Promise.all(providers.map(async (provider) => {
            const { result, response, retried } = await runProviderWithOneRetry(data.roomId, provider, {
              prompt: data.prompt,
              history: data.history,
              language,
              modelSelections,
            });

            if (result.blocked && !blockedResult) blockedResult = result;
            if (response) responsesByProvider.set(provider, response);

            sendLine(controller, {
              type: "provider",
              provider,
              name: PROVIDER_LABELS[provider],
              modelId: modelSelections?.[provider],
              model: response?.model,
              content: result.blocked ? result.finalAnswer : (response?.content || ""),
              latencyMs: response?.latencyMs ?? result.latencyMs,
              error: response?.error || (!result.blocked && !response?.content?.trim() ? "No complete answer returned after retry." : undefined),
              retried,
            });
          }));

          const responses = providers
            .map((provider) => responsesByProvider.get(provider))
            .filter((item): item is AIProviderResponse => Boolean(item));

          const result = blockedResult || (() => {
            const scoring = synthesizeBestAnswer(data.prompt, responses);
            const successful = responses.filter((item) => !item.error && item.content.trim());
            const finalAnswer = successful.length
              ? successful.map((item) => `### ${PROVIDER_LABELS[item.provider]}\n${item.content.trim()}`).join("\n\n")
              : "No selected AI returned a complete answer.";
            return {
              blocked: false,
              providers,
              responses,
              finalAnswer,
              comparison: {
                ...scoring.comparison,
                notes: [
                  "Each selected AI ran independently and was released to the user immediately on completion without waiting for sibling AIs.",
                  "Explicit model selections are resolved through the Royal Command Model Registry and are never silently substituted with a different model.",
                  "Empty or failed provider output receives one automatic retry before being reported as incomplete.",
                  ...scoring.comparison.notes,
                ],
              },
              latencyMs: Date.now() - started,
            };
          })();

          let userMessage: unknown = null;
          let aiMessage: unknown = null;

          if (isSupabaseConfigured()) {
            const supabase = await createClient();
            const { data: userMsg } = await supabase
              .from("messages")
              .insert({ room_id: data.roomId, author_id: user.id, author_type: "user", content: data.prompt, language })
              .select("*")
              .single();
            const { data: aiMsg } = await supabase
              .from("messages")
              .insert({
                room_id: data.roomId,
                author_type: "ai",
                content: result.finalAnswer,
                language,
                metadata: { blocked: result.blocked, comparison: result.comparison, providers: result.providers },
              })
              .select("*")
              .single();
            await supabase.from("ai_runs").insert({
              room_id: data.roomId,
              message_id: aiMsg?.id,
              prompt: data.prompt,
              providers: result.providers,
              responses: result.responses,
              final_answer: result.finalAnswer,
              comparison: result.comparison,
              status: result.blocked ? "completed" : result.responses.some((item) => item.error) ? "partial" : "completed",
              latency_ms: result.latencyMs,
              created_by: user.id,
            });
            userMessage = userMsg;
            aiMessage = aiMsg;
          } else {
            userMessage = localDb.addMessage({ roomId: data.roomId, authorType: "user", content: data.prompt, language });
            aiMessage = localDb.addMessage({
              roomId: data.roomId,
              authorType: "ai",
              content: result.finalAnswer,
              language,
              metadata: { blocked: result.blocked, comparison: result.comparison, providers: result.providers, responses: result.responses },
            });
          }

          logger.info("chat.stream.completed", {
            roomId: data.roomId,
            providers,
            modelSelections: modelSelections || {},
            latencyMs: result.latencyMs,
          });
          sendLine(controller, { type: "final", result: { ...result, userMessage, aiMessage } });
          controller.close();
        })().catch((error) => {
          logger.error("chat.stream.failed", { error: error instanceof Error ? error.message : error });
          sendLine(controller, { type: "error", error: "AI streaming orchestration failed" });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    logger.error("chat.stream.setup_failed", { error: error instanceof Error ? error.message : error });
    if (error instanceof z.ZodError) return new Response(JSON.stringify({ error: error.flatten() }), { status: 400, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ error: "AI streaming setup failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
