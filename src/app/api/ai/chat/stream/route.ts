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
} from "@/lib/ai/executionRouting";
import { buildRepositoryInspectionContext, type RepositoryInspectionEvidence } from "@/lib/ai/repositoryInspectionContext";
import type { RcMemberCommand } from "@/lib/ai/rcMemberLayer";
import { chatSchema } from "@/lib/validations";
import { localDb } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const EXECUTION_PROVIDER_NAMES: Partial<Record<AIProviderId, string>> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  codex: "Codex",
};

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
  const executionTuple = /^(?:openai|anthropic|google|xai|codex|chatgpt|claude|gemini|grok)\s*\|\s*.+\|\s*(?:ok|error)$/i;

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
    memberCommand: RcMemberCommand;
  },
  language: string,
) {
  const executionPrompt = data.memberCommand.effectivePrompt;
  const executionProviders = data.memberCommand.leadProviders
    .filter((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number]));
  if (!executionProviders.length) throw new Error("No selected connected developer AI was assigned");

  const workSeed = await orchestrateRoom(data.roomId, {
    prompt: executionPrompt,
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
    "Use only the provider explicitly selected by the user for this lane.",
    "",
    executionPrompt,
  ].join("\n");

  const cookie = request.headers.get("cookie") || "";

  const executions = await Promise.all(executionProviders.map(async (provider) => {
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

      return {
        provider,
        name,
        branch: String(executed.branch || ""),
        commits: Array.isArray(executed.commits) ? executed.commits : [],
        pr: executed.pr || null,
        summary: String(review.summary || `${name} development execution completed.`),
      };
    } catch (error) {
      return {
        provider,
        name,
        branch: "",
        commits: [],
        pr: null,
        summary: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }));

  const successful = executions.filter((item) => !item.error && item.commits.length > 0);
  const sections = executions.map((item) => {
    if (item.error) return `### ${item.name}\nStatus: EXECUTION FAILED\nError: ${item.error}`;
    const changed = item.commits.map((commit: { path?: string; operation?: string; commit?: string }) => `- ${commit.operation || "update"}: ${commit.path || ""} — ${commit.commit || ""}`).join("\n");
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
        metadata: { workId: workSeed.workId, revision: workSeed.revision, developerExecutions: executions, memberCommand: data.memberCommand },
      })
      .select("*")
      .single();
    userMessage = userMsg;
    aiMessage = aiMsg;
  } else {
    userMessage = localDb.addMessage({ roomId: data.roomId, authorType: "user", content: data.prompt, language });
    aiMessage = localDb.addMessage({ roomId: data.roomId, authorType: "ai", content: finalAnswer, language, metadata: { developerExecutions: executions, memberCommand: data.memberCommand } });
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
        "Executable RC Room development is routed only to user-selected connected developer AIs.",
        "ChatGPT, Claude, Gemini, Grok, and Codex use the same host GitHub execution contract and isolated provider branches.",
        "Selected developer AIs execute in parallel when their work is independently assigned.",
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
    const memberCommand = data.memberCommand as RcMemberCommand;

    logger.info("chat.stream.member_command", {
      roomId: data.roomId,
      mode: memberCommand.mode,
      leadProviders: memberCommand.leadProviders,
      reviewOnlyProviders: memberCommand.reviewOnlyProviders,
      gitWrite: memberCommand.gitWrite,
      continuedFromPriorOrder: memberCommand.continuedFromPriorOrder,
    });

    if (memberCommand.mode === "execute") {
      const payload = await runSelectedDeveloperAgents(request, {
        roomId: data.roomId,
        prompt: data.prompt,
        history: data.history,
        providers: data.providers as AIProviderId[] | undefined,
        language,
        modelSelections,
        memberCommand,
      }, language);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          sendLine(controller, { type: "final", result: payload, developerExecution: true, memberCommand });
          controller.close();
        },
      });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
    }

    const available = new Set(getAvailableProviderIds());
    const modelSelectedProviders = Object.keys(modelSelections || {}) as AIProviderId[];
    const requestedProviders = data.providers?.length
      ? data.providers as AIProviderId[]
      : modelSelectedProviders;
    const providers = requestedProviders.filter((id) => available.has(id));
    const started = Date.now();
    const repositoryInspection = memberCommand.mode === "inspect";
    const providerPrompt = repositoryInspection ? memberCommand.effectivePrompt : data.prompt;

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
                const inspection = await buildRepositoryInspectionContext(provider, providerPrompt);
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
              prompt: providerPrompt,
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
                  memberCommand,
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

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              memberCommand,
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
                  "The selected provider list is authoritative; prompt text is not used to reassign providers.",
                  "Explicit model selections are resolved through the Royal Command Model Registry and are never silently substituted with a different model.",
                  "Empty or failed provider output receives one automatic retry before being reported as incomplete.",
                  ...(repositoryInspection ? ["Read-only GitHub inspection is authorized only by memberCommand.mode=inspect and performs no repository mutation."] : []),
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
                  memberCommand,
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
                memberCommand,
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
            memberMode: memberCommand.mode,
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
