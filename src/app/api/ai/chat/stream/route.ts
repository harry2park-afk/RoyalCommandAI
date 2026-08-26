import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { orchestrateRoom, type RoomWorkRecord } from "@/lib/ai/orchestrateRoom";
import { getAvailableProviderIds } from "@/lib/ai/connectors";
import type { AIModelId } from "@/lib/ai/modelRegistry";
import { synthesizeBestAnswer } from "@/lib/ai/synthesize";
import type { AIProviderId, AIProviderResponse } from "@/lib/ai/types";
import { PROVIDER_LABELS } from "@/lib/ai/types";
import {
  DEV_PROVIDER_IDS,
  DEV_PROVIDER_NAMES,
  resolvePromptProviders as resolveExecutionProviders,
  shouldRunDeveloperAgent as shouldRunDeveloperAgentV2,
} from "@/lib/ai/executionRouting";
import { buildRepositoryInspectionContext, isRepositoryInspectionIntent, type RepositoryInspectionEvidence } from "@/lib/ai/repositoryInspectionContext";
import { chatSchema } from "@/lib/validations";
import { localDb } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const maxDuration = 240;

const EXECUTION_PROVIDER_NAMES: Partial<Record<AIProviderId, string>> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
};

const PROVIDER_MENTIONS: Array<{ id: AIProviderId; pattern: RegExp }> = [
  { id: "openai", pattern: /(chatgpt|openai|챗지피티|챗GPT)/i },
  { id: "anthropic", pattern: /(claude|클로드)/i },
  { id: "google", pattern: /(gemini|제미나이)/i },
  { id: "xai", pattern: /(grok|그록)/i },
];

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

function enforceAuthoritativeWorkMetadata(
  content: string,
  work: RoomWorkRecord | undefined,
  provider: AIProviderId,
  model?: string,
  error?: string,
) {
  if (!work || !content.trim()) return content;

  const metadataLine = /(?:\bwork\s*id\b|\bparent\s+revision\b|\brevision\b|\broom\s*id\b|\bcreated\s+at\b|\bRC-\d{8}(?:-[A-Z0-9]+)+\b)/i;
  const metadataHeading = /(?:host[- ]verified\s+work\s+metadata|host\s*지정\s*메타데이터|현재\s*host\s*지정\s*메타데이터|work\s+metadata)/i;
  const executionLine = /^(?:provider|model|status|상태)\s*(?::|-)/i;
  const executionHeading = /(?:host[- ]verified\s+execution\s+identity|execution\s+identity)/i;
  const executionTuple = /^(?:openai|anthropic|google|xai|chatgpt|claude|gemini|grok)\s*\|\s*.+\|\s*(?:ok|error)$/i;

  const cleanedLines = content.split("\n").filter((line) => {
    const plain = line.replace(/[*_`#>|]/g, "").trim();
    if (!plain) return true;
    if (metadataHeading.test(plain) || executionHeading.test(plain)) return false;
    if (metadataLine.test(plain) || executionLine.test(plain) || executionTuple.test(plain)) return false;
    return true;
  });

  const body = cleanedLines
    .join("\n")
    .replace(/^\s*(?:---\s*)?\n+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const header = [
    "**Host-Verified Work Metadata**",
    `**Work ID:** ${work.workId}`,
    `**Revision:** ${work.revision}`,
    `**Parent Revision:** ${work.parentRevision ?? "none"}`,
    `**Room ID:** ${work.roomId}`,
  ].join("\n");

  const executionIdentity = [
    "**Host-Verified Execution Identity**",
    `**Provider:** ${EXECUTION_PROVIDER_NAMES[provider] || provider}`,
    `**Model:** ${model || "unknown"}`,
    `**Status:** ${!error && content.trim().length > 1 ? "OK" : "ERROR"}`,
  ].join("\n");

  return body ? `${header}\n\n${body}\n\n${executionIdentity}` : `${header}\n\n${executionIdentity}`;
}

async function runProviderWithOneRetry(
  roomId: string,
  provider: AIProviderId,
  input: {
    prompt: string;
    history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    language?: string;
    modelSelections?: Partial<Record<AIProviderId, AIModelId>>;
    systemExtra?: string;
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

async function runSelectedDeveloperAgents(
  request: Request,
  data: {
    roomId: string;
    prompt: string;
    history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    providers?: AIProviderId[];
    language?: string;
    modelSelections?: Partial<Record<AIProviderId, AIModelId>>;
  },
  language: string,
) {
  const requested = resolveExecutionProviders(data.prompt, data.providers)
    ?.filter((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number])) || [];
  const executionProviders: AIProviderId[] = requested.length
    ? requested
    : (data.providers || []).filter((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number])).slice(0, 1);
  if (!executionProviders.length) executionProviders.push("openai");

  // One host work record is shared by all explicitly assigned developer AIs.
  const workSeed = await orchestrateRoom(data.roomId, {
    prompt: data.prompt,
    history: data.history,
    providers: executionProviders,
    language,
    modelSelections: data.modelSelections,
  });
  if (!workSeed.workId || !workSeed.revision) throw new Error("Host work metadata was not created for developer execution");

  const verifiedInstruction = [
    "ROYAL COMMAND HOST VERIFIED WORK METADATA — REQUIRED FOR EXECUTION",
    `Work ID: ${workSeed.workId}`,
    `Revision: ${workSeed.revision}`,
    `Room ID: ${data.roomId}`,
    "Every code change, branch, commit, PR and report must use this Work ID and Revision.",
    "Do not write directly to master. Use the Work-ID provider branch and return verified evidence.",
    "Production merge/deploy requires separate user approval; that safety gate does not cancel development execution.",
    "",
    data.prompt,
  ].join("\n");

  const cookie = request.headers.get("cookie") || "";
  const executions: Array<{
    provider: AIProviderId;
    name: string;
    branch: string;
    commits: Array<{ path?: string; operation?: string; commit?: string }>;
    pr: { number?: number | null; url?: string; warning?: string } | null;
    summary: string;
    error?: string;
  }> = [];

  for (const provider of executionProviders) {
    const name = DEV_PROVIDER_NAMES[provider] || provider;
    try {
      const reviewResponse = await fetch(new URL("/api/dev/agent", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ provider, instruction: verifiedInstruction }),
        cache: "no-store",
      });
      const review = await reviewResponse.json();
      if (!reviewResponse.ok) throw new Error(review.error || `${name} developer review failed`);
      const actions = Array.isArray(review.actions) ? review.actions : [];
      if (!actions.length) throw new Error(`${name} returned no executable file actions`);

      const executeResponse = await fetch(new URL("/api/dev/agent", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ provider, instruction: verifiedInstruction, execute: true, actions }),
        cache: "no-store",
      });
      const executed = await executeResponse.json();
      if (!executeResponse.ok) throw new Error(executed.error || `${name} developer execution failed`);
      if (executed.evidenceVerified !== true) throw new Error(`${name} execution returned without verified commit evidence`);

      executions.push({
        provider,
        name,
        branch: String(executed.branch || ""),
        commits: Array.isArray(executed.commits) ? executed.commits : [],
        pr: executed.pr || null,
        summary: String(review.summary || `${name} development execution completed.`),
      });
    } catch (error) {
      executions.push({
        provider,
        name,
        branch: "",
        commits: [],
        pr: null,
        summary: "",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const successful = executions.filter((item) => !item.error && item.commits.length > 0);
  const sections = executions.map((item) => {
    if (item.error) return `### ${item.name}\nStatus: EXECUTION FAILED\nError: ${item.error}`;
    const changed = item.commits.map((commit) => `- ${commit.operation || "update"}: ${commit.path || ""} — ${commit.commit || ""}`).join("\n");
    return [
      `### ${item.name}`,
      "Status: CODE_CHANGED_ON_SAFE_BRANCH",
      `Branch: ${item.branch}`,
      `PR: ${item.pr?.number || "not-created"}${item.pr?.url ? ` — ${item.pr.url}` : ""}`,
      item.summary,
      changed ? `Changed files:\n${changed}` : "",
    ].filter(Boolean).join("\n");
  });

  const finalAnswer = [
    "**Host-Verified Work Metadata**",
    `**Work ID:** ${workSeed.workId}`,
    `**Revision:** ${workSeed.revision}`,
    `**Parent Revision:** ${workSeed.workRecord?.parentRevision ?? "none"}`,
    `**Room ID:** ${data.roomId}`,
    "",
    ...sections,
    "",
    successful.length === executions.length
      ? "**Final Status:** ALL ASSIGNED AI EXECUTIONS VERIFIED"
      : successful.length
        ? "**Final Status:** PARTIAL EXECUTION — see failed provider details above"
        : "**Final Status:** EXECUTION FAILED",
    "Production merge/deploy was not performed.",
  ].join("\n\n");

  let userMessage: unknown = null;
  let aiMessage: unknown = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: userMsg } = await supabase
      .from("messages")
      .insert({ room_id: data.roomId, author_type: "user", content: data.prompt, language })
      .select("*")
      .single();
    const { data: aiMsg } = await supabase
      .from("messages")
      .insert({
        room_id: data.roomId,
        author_type: "ai",
        content: finalAnswer,
        language,
        metadata: { workId: workSeed.workId, revision: workSeed.revision, developerExecutions: executions },
      })
      .select("*")
      .single();
    userMessage = userMsg;
    aiMessage = aiMsg;
  } else {
    userMessage = localDb.addMessage({ roomId: data.roomId, authorType: "user", content: data.prompt, language });
    aiMessage = localDb.addMessage({ roomId: data.roomId, authorType: "ai", content: finalAnswer, language, metadata: { developerExecutions: executions } });
  }

  return {
    blocked: false,
    providers: executionProviders,
    responses: executions.map((item) => ({
      provider: item.provider,
      content: item.error ? `EXECUTION FAILED: ${item.error}` : item.summary,
      latencyMs: 0,
      ...(item.error ? { error: item.error } : {}),
    })),
    workId: workSeed.workId,
    revision: workSeed.revision,
    workRecord: workSeed.workRecord,
    finalAnswer,
    comparison: {
      winners: successful.map((item) => item.provider),
      notes: [
        "Executable RC Room development is routed to the explicitly assigned provider's developer agent.",
        "ChatGPT, Claude, Gemini, and Grok use the same host GitHub execution contract and isolated provider branches.",
        "Production merge/deploy remains approval-gated.",
      ],
    },
    latencyMs: workSeed.latencyMs,
    userMessage,
    aiMessage,
    developerExecutions: executions,
  };
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

    if (shouldRunDeveloperAgentV2(data.prompt)) {
      const payload = await runSelectedDeveloperAgents(request, {
        roomId: data.roomId,
        prompt: data.prompt,
        history: data.history,
        providers: data.providers as AIProviderId[] | undefined,
        language,
        modelSelections,
      }, language);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          sendLine(controller, { type: "final", result: payload, developerExecution: true });
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
    const repositoryInspection = isRepositoryInspectionIntent(data.prompt);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        void (async () => {
          if (!providers.length) {
            sendLine(controller, { type: "error", error: "No selected AI is connected." });
            controller.close();
            return;
          }

          const responsesByProvider = new Map<AIProviderId, AIProviderResponse>();
          const resultsByProvider = new Map<AIProviderId, Awaited<ReturnType<typeof orchestrateRoom>>>();
          const repositoryEvidenceByProvider = new Map<AIProviderId, RepositoryInspectionEvidence>();
          let blockedResult: Awaited<ReturnType<typeof orchestrateRoom>> | null = null;

          await Promise.all(providers.map(async (provider) => {
            let systemExtra: string | undefined;
            if (repositoryInspection) {
              try {
                const inspection = await buildRepositoryInspectionContext(provider, data.prompt);
                systemExtra = inspection.systemExtra;
                repositoryEvidenceByProvider.set(provider, inspection.evidence);
                logger.info("chat.stream.repository_evidence_loaded", {
                  roomId: data.roomId,
                  provider,
                  readPaths: inspection.evidence.readPaths,
                  selector: inspection.evidence.selector,
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                logger.warn("chat.stream.repository_evidence_failed", { roomId: data.roomId, provider, error: message });
                systemExtra = [
                  "ROYAL COMMAND HOST TOOL ERROR — GITHUB REPOSITORY READ",
                  `The host attempted a real GitHub repository inspection for this request but failed: ${message}`,
                  "Do not invent repository paths or source facts. Report FOUND NOT CONFIRMED and the host error plainly.",
                ].join("\n");
              }
            }

            const { result, response, retried } = await runProviderWithOneRetry(data.roomId, provider, {
              prompt: data.prompt,
              history: data.history,
              language,
              modelSelections,
              systemExtra,
            });

            const authoritativeResponse = response
              ? {
                  ...response,
                  content: enforceAuthoritativeWorkMetadata(
                    response.content,
                    result.workRecord,
                    provider,
                    response.model,
                    response.error,
                  ),
                }
              : undefined;

            resultsByProvider.set(provider, result);
            if (result.blocked && !blockedResult) blockedResult = result;
            if (authoritativeResponse) responsesByProvider.set(provider, authoritativeResponse);

            sendLine(controller, {
              type: "provider",
              provider,
              name: PROVIDER_LABELS[provider],
              modelId: modelSelections?.[provider],
              model: authoritativeResponse?.model,
              content: result.blocked ? result.finalAnswer : (authoritativeResponse?.content || ""),
              latencyMs: authoritativeResponse?.latencyMs ?? result.latencyMs,
              error: authoritativeResponse?.error || (!result.blocked && !authoritativeResponse?.content?.trim() ? "No complete answer returned after retry." : undefined),
              retried,
              ...(repositoryEvidenceByProvider.has(provider) ? { toolEvidence: repositoryEvidenceByProvider.get(provider) } : {}),
            });
          }));

          const responses = providers
            .map((provider) => responsesByProvider.get(provider))
            .filter((item): item is AIProviderResponse => Boolean(item));

          const workSource = providers
            .map((provider) => resultsByProvider.get(provider))
            .find((item) => Boolean(item?.workId && item?.revision && item?.workRecord));
          const workId = workSource?.workId;
          const revision = workSource?.revision;
          const workRecord = workSource?.workRecord;
          const workHeader = workId && revision ? `**Work ID:** ${workId} | **Revision:** ${revision}` : "";
          const withWorkHeader = (answer: string) => workHeader ? `${workHeader}\n\n${answer}` : answer;
          const workNote = workId && revision ? `Royal Command work record: ${workId}, Revision ${revision}.` : "";

          if (isSupabaseConfigured() && workId && revision) {
            const supabase = await createClient();
            const completedAt = new Date().toISOString();
            const successfulProviders = responses.filter((item) => !item.error && item.content.trim()).length;
            const failedProviders = responses.filter((item) => Boolean(item.error)).length;
            const aggregateStatus = blockedResult
              ? "reportable"
              : successfulProviders > 0
                ? "done"
                : "failed";
            const { error: workEvidenceError } = await supabase
              .from("room_work_records")
              .update({
                status: aggregateStatus,
                updated_at: completedAt,
                evidence: {
                  providers,
                  successfulProviders,
                  failedProviders,
                  blocked: Boolean(blockedResult),
                  latencyMs: Date.now() - started,
                  completedAt,
                  providerResults: responses.map((item) => ({
                    provider: item.provider,
                    model: item.model,
                    success: !item.error && Boolean(item.content.trim()),
                    error: item.error || null,
                  })),
                  ...(repositoryInspection ? {
                    toolEvidence: providers
                      .map((provider) => repositoryEvidenceByProvider.get(provider))
                      .filter((item): item is RepositoryInspectionEvidence => Boolean(item)),
                  } : {}),
                },
              })
              .eq("room_id", data.roomId)
              .eq("work_id", workId)
              .eq("revision", revision);

            if (workEvidenceError) {
              logger.warn("chat.stream.work_evidence_aggregate_failed", {
                roomId: data.roomId,
                workId,
                revision,
                error: workEvidenceError.message,
              });
            }
          }

          let result: any;

          if (blockedResult) {
            result = blockedResult;
          } else {
            const scoring = synthesizeBestAnswer(data.prompt, responses);
            const successful = responses.filter((item) => !item.error && item.content.trim());
            const finalAnswer = successful.length
              ? successful.map((item) => `### ${PROVIDER_LABELS[item.provider]}\n${item.content.trim()}`).join("\n\n")
              : "No selected AI returned a complete answer.";
            result = {
              blocked: false,
              providers,
              responses,
              workId,
              revision,
              workRecord,
              finalAnswer: withWorkHeader(finalAnswer),
              ...(repositoryInspection ? {
                toolEvidence: providers
                  .map((provider) => repositoryEvidenceByProvider.get(provider))
                  .filter((item): item is RepositoryInspectionEvidence => Boolean(item)),
              } : {}),
              comparison: {
                ...scoring.comparison,
                ...(workRecord ? { work: workRecord } : {}),
                notes: [
                  "Each selected AI runs independently; no Council peer-review or synthesis pass is executed.",
                  "Explicit model selections are resolved through the Royal Command Model Registry and are never silently substituted with a different model.",
                  "Empty or failed provider output receives one automatic retry before being reported as incomplete.",
                  ...(repositoryInspection ? ["Read-only GitHub inspection uses host-verified repository evidence injected into the selected provider context; it performs no repository mutation."] : []),
                  ...(workNote ? [workNote] : []),
                  ...scoring.comparison.notes,
                ],
              },
              latencyMs: Date.now() - started,
            };
          }

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
                metadata: {
                  blocked: result.blocked,
                  comparison: result.comparison,
                  providers: result.providers,
                  workId: result.workId,
                  revision: result.revision,
                  workRecord: result.workRecord,
                  ...(result.toolEvidence ? { toolEvidence: result.toolEvidence } : {}),
                },
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
              status: result.blocked ? "completed" : result.responses.some((item: AIProviderResponse) => item.error) ? "partial" : "completed",
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
              metadata: {
                blocked: result.blocked,
                comparison: result.comparison,
                providers: result.providers,
                responses: result.responses,
                workId: result.workId,
                revision: result.revision,
                workRecord: result.workRecord,
                ...(result.toolEvidence ? { toolEvidence: result.toolEvidence } : {}),
              },
            });
          }

          logger.info("chat.stream.completed", {
            roomId: data.roomId,
            providers,
            modelSelections: modelSelections || {},
            workId: result.workId,
            revision: result.revision,
            latencyMs: result.latencyMs,
            repositoryInspection,
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
