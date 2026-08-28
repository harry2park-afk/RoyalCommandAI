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

type RelayReview = {
  provider: AIProviderId;
  name: string;
  content: string;
  error?: string;
};

function actionReviewPacket(actions: Array<Record<string, unknown>>) {
  const MAX_REVIEW_CHARS = 36000;
  let used = 0;
  const sections: string[] = [];

  for (const raw of actions) {
    const path = String(raw.path || "");
    const operation = String(raw.operation || "update");
    const reason = String(raw.reason || "");
    const content = typeof raw.content === "string" ? raw.content : "";
    const header = `FILE: ${path}\nOPERATION: ${operation}\nREASON: ${reason}`;
    const remaining = Math.max(0, MAX_REVIEW_CHARS - used - header.length - 40);
    const body = remaining > 0 ? content.slice(0, remaining) : "";
    sections.push(`${header}\nCONTENT:\n${body}${content.length > body.length ? "\n[HOST REVIEW PACKET TRUNCATED]" : ""}`);
    used += header.length + body.length + 40;
    if (used >= MAX_REVIEW_CHARS) break;
  }

  return sections.join("\n\n---\n\n");
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
  const writer = data.memberCommand.leadProviders
    .find((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number]));
  const reviewProviders = data.memberCommand.reviewOnlyProviders
    .filter((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number]));
  if (!writer) throw new Error("No selected connected developer AI was assigned as writer");

  const workSeed = await orchestrateRoom(data.roomId, {
    prompt: executionPrompt,
    history: data.history,
    providers: [writer],
    language,
    modelSelections: data.modelSelections,
  });
  if (!workSeed.workId || !workSeed.revision) throw new Error("Host work metadata was not created for developer execution");

  const writerName = DEV_PROVIDER_NAMES[writer] || writer;
  const verifiedInstruction = [
    "ROYAL COMMAND HOST VERIFIED WORK METADATA — REQUIRED FOR EXECUTION",
    `Work ID: ${workSeed.workId}`,
    `Revision: ${workSeed.revision}`,
    `Room ID: ${data.roomId}`,
    `Single Write Authority: ${writerName} is the only provider allowed to write for this task.`,
    "Other selected AIs are review-only and must not write, commit, push or merge.",
    "Every code change, branch, commit, PR and report must use this Work ID and Revision.",
    "Do not write directly to master. Use the Work-ID provider branch and return verified evidence.",
    "Production merge/deploy remains outside this development execution; prepare a testable safe branch first.",
    "Preserve existing working features and make the smallest coherent change that satisfies the user order.",
    "",
    executionPrompt,
  ].join("\n");

  const cookie = request.headers.get("cookie") || "";

  const createPlan = async (instruction: string) => {
    const response = await fetch(new URL("/api/dev/agent", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ provider: writer, instruction }),
      cache: "no-store",
    });
    const plan = await response.json();
    if (!response.ok) throw new Error(plan.error || `${writerName} developer planning failed`);
    const actions = Array.isArray(plan.actions) ? plan.actions : [];
    if (!actions.length) throw new Error(`${writerName} returned no executable file actions`);
    return { ...plan, actions };
  };

  let draftPlan = await createPlan(verifiedInstruction);
  let relayReviews: RelayReview[] = [];

  if (reviewProviders.length) {
    const packet = actionReviewPacket(draftPlan.actions as Array<Record<string, unknown>>);
    relayReviews = await Promise.all(reviewProviders.map(async (provider): Promise<RelayReview> => {
      const name = DEV_PROVIDER_NAMES[provider] || provider;
      const reviewPrompt = [
        "ROYAL COMMAND RELAY REVIEW — READ ONLY",
        `Work ID: ${workSeed.workId}`,
        `Revision: ${workSeed.revision}`,
        `Writer: ${writerName}`,
        `Reviewer: ${name}`,
        "You are a reviewer only. Do not modify code, create files, commit, push, merge, deploy, or impersonate the writer.",
        "Review the writer's exact proposed file actions below against the user's order.",
        "Focus only on material defects, regressions, security problems, missing requirements, or unnecessary scope.",
        "Return a concise review with: VERDICT: PASS or REWORK; then findings with P0/P1/P2. If no material issue exists, return VERDICT: PASS.",
        "",
        "USER ORDER:",
        executionPrompt,
        "",
        "WRITER PROPOSED ACTIONS:",
        packet,
      ].join("\n");

      try {
        const result = await orchestrateRoom(data.roomId, {
          prompt: reviewPrompt,
          history: [],
          providers: [provider],
          language,
          modelSelections: data.modelSelections,
        });
        const response = result.responses.find((item) => item.provider === provider);
        if (!response || response.error || !response.content.trim()) {
          throw new Error(response?.error || `${name} returned no review`);
        }
        return { provider, name, content: response.content.trim() };
      } catch (error) {
        return { provider, name, content: "", error: error instanceof Error ? error.message : String(error) };
      }
    }));

    const usableReviews = relayReviews.filter((item) => !item.error && item.content.trim());
    if (usableReviews.length) {
      const reviewerFeedback = usableReviews
        .map((item) => `### ${item.name}\n${item.content}`)
        .join("\n\n");
      const refinementInstruction = [
        verifiedInstruction,
        "",
        "ROYAL COMMAND RELAY REFINEMENT — ONE PASS ONLY",
        "Independent reviewers examined your proposed file actions. Re-evaluate their findings against the user order and current repository.",
        "Fix valid material findings, reject irrelevant findings, preserve working features, and return one final minimal executable plan.",
        "Do not broaden scope merely because a reviewer suggested extra work.",
        "",
        reviewerFeedback,
      ].join("\n");
      draftPlan = await createPlan(refinementInstruction);
    }
  }

  const executeResponse = await fetch(new URL("/api/dev/agent", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ provider: writer, instruction: verifiedInstruction, execute: true, actions: draftPlan.actions }),
    cache: "no-store",
  });
  const executed = await executeResponse.json();
  if (!executeResponse.ok) throw new Error(executed.error || `${writerName} developer execution failed`);
  if (executed.evidenceVerified !== true) throw new Error(`${writerName} execution returned without verified commit evidence`);

  const commits = Array.isArray(executed.commits) ? executed.commits : [];
  const branch = String(executed.branch || "");
  const changed = commits
    .map((commit: { path?: string; operation?: string; commit?: string }) => `- ${commit.operation || "update"}: ${commit.path || ""} — ${commit.commit || ""}`)
    .join("\n");
  const reviewSections = relayReviews.map((item) => item.error
    ? `### ${item.name} — REVIEW FAILED\n${item.error}`
    : `### ${item.name} — REVIEW ONLY\n${item.content}`);
  const failedReviews = relayReviews.filter((item) => item.error).length;

  const finalAnswer = [
    "**Host-Verified Work Metadata**",
    `**Work ID:** ${workSeed.workId}`,
    `**Revision:** ${workSeed.revision}`,
    `**Parent Revision:** ${workSeed.workRecord?.parentRevision ?? "none"}`,
    `**Room ID:** ${data.roomId}`,
    "",
    "### Relay Stage 1 — Writer",
    `Writer: ${writerName}`,
    "Status: FINAL PLAN EXECUTED ON SAFE BRANCH",
    `Branch: ${branch}`,
    `PR: ${executed.pr?.number || "not-created"}${executed.pr?.url ? ` — ${executed.pr.url}` : ""}`,
    String(draftPlan.summary || `${writerName} relay-refined development plan executed.`),
    changed ? `Changed files:\n${changed}` : "",
    "",
    reviewSections.length ? "### Relay Stage 2 — Independent Reviews" : "",
    ...reviewSections,
    "",
    failedReviews
      ? `**Final Status:** PARTIAL — WRITER COMMIT EVIDENCE VERIFIED; ${failedReviews} REVIEWER(S) FAILED TO RETURN A REVIEW`
      : "**Final Status:** RELAY EXECUTION VERIFIED — SINGLE WRITER + REVIEW + ONE-PASS REFINEMENT + COMMIT EVIDENCE",
    "Production merge/deploy was not performed. The safe branch is ready for preview/test deployment.",
  ].filter(Boolean).join("\n\n");

  const developerExecutions = [
    {
      provider: writer,
      name: writerName,
      role: "writer",
      branch,
      commits,
      pr: executed.pr || null,
      summary: String(draftPlan.summary || `${writerName} development execution completed.`),
    },
    ...relayReviews.map((item) => ({
      provider: item.provider,
      name: item.name,
      role: "reviewer",
      branch: "",
      commits: [],
      pr: null,
      summary: item.content,
      ...(item.error ? { error: item.error } : {}),
    })),
  ];

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
        metadata: { workId: workSeed.workId, revision: workSeed.revision, developerExecutions, memberCommand: data.memberCommand },
      })
      .select("*")
      .single();
    userMessage = userMsg;
    aiMessage = aiMsg;
  } else {
    userMessage = localDb.addMessage({ roomId: data.roomId, authorType: "user", content: data.prompt, language });
    aiMessage = localDb.addMessage({ roomId: data.roomId, authorType: "ai", content: finalAnswer, language, metadata: { developerExecutions, memberCommand: data.memberCommand } });
  }

  return {
    blocked: false,
    providers: [writer, ...reviewProviders],
    responses: [
      {
        provider: writer,
        content: String(draftPlan.summary || `${writerName} development execution completed.`),
        latencyMs: 0,
      },
      ...relayReviews.map((item) => ({
        provider: item.provider,
        content: item.error ? `REVIEW FAILED: ${item.error}` : item.content,
        latencyMs: 0,
        ...(item.error ? { error: item.error } : {}),
      })),
    ],
    workId: workSeed.workId,
    revision: workSeed.revision,
    workRecord: workSeed.workRecord,
    finalAnswer,
    comparison: {
      winners: [writer],
      notes: [
        `Single Write Authority: only ${writerName} may mutate repository files for this task.`,
        "Other selected developer AIs are review-only and receive the writer's proposed file actions before execution.",
        "Reviewer findings are returned to the writer for exactly one bounded refinement pass before commit.",
        "SUCCESS requires host-verified commit evidence; reviewer failure is reported as PARTIAL rather than hidden.",
        "Production merge/deploy remains outside the relay execution and is prepared only after preview testing.",
      ],
    },
    latencyMs: workSeed.latencyMs,
    userMessage,
    aiMessage,
    developerExecutions,
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
