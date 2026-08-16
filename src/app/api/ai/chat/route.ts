import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { orchestrateRoom } from "@/lib/ai/orchestrateRoom";
import type { AIProviderId } from "@/lib/ai/types";
import { chatSchema } from "@/lib/validations";
import { localDb } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const maxDuration = 240;

const DEV_REVIEW_TIMEOUT_MS = 30_000;
const DEV_EXECUTE_TIMEOUT_MS = 90_000;

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

const LIVING_RULES = `ROYAL COMMAND LIVING RULES — CURRENT OPERATING PRINCIPLE\nRoyal Command rules, workflows, roles, and operating orders evolve continuously. The newest Harry-approved order supersedes any older rule that conflicts with it. Older rules remain active only where they do not conflict with the newer approved order. Never revive superseded behavior merely because it appears in older chat history, code comments, documents, or prior system instructions. Interpret the newest approved order together with all still-valid non-conflicting rules and the complete shared context. If approval or recency is genuinely unclear, surface the conflict instead of silently applying an obsolete rule.`;

const COUNTRY_BUILD_ORDER = `ROYAL COMMAND COUNTRY BUILD ORDER — HARRY PARK APPROVED\nStart: 2026-08-15 Australia/Sydney.\nMission: Build Royal Command country-by-country as one cooperating AI engineering team. One lead AI owns one country, while all AIs help each other with their strongest capabilities. Reuse the latest approved common Royal Command base frame; do not rebuild from scratch.\nPhase 1 assignments:\n- ChatGPT: Australia lead. Finish and stabilise the common/base app frame first, and continue helping every other country lead with architecture, integration, debugging, security and shared components.\n- Gemini: United States lead.\n- Claude: United Kingdom lead.\n- Grok: Canada lead.\nCooperation rule: the country lead is accountable for completion, but must freely request and use help from other AIs. Avoid duplicate work. Shared improvements go back into the common frame for reuse by every country.\nCountry rule: clone/reuse the approved base frame and isolate only country-specific configuration, legal text, language, payments, telephony, identity, tax/compliance and integrations. Use a country-specific official Royal Command domain only after verifying Royal Command controls that domain and its DNS/hosting. Never invent domain ownership.\nSecurity: no universal master credential, no secrets in source, use least-privilege service credentials, preserve auditability, reversible deployments and Harry Park approval gates for material production changes.\nScale target: establish this pattern in Australia, USA, UK and Canada, then expand toward approximately 100 countries.\nPersistent reference: docs/ROYAL_COMMAND_COUNTRY_BUILD_ORDER.md.`;

function looksLikeDevelopmentInstruction(prompt: string) {
  return /(코드|개발|수정|고쳐|고치|버그|오류|ui|화면|레이아웃|사이드바|버튼|기능 추가|기능을 추가|파일 생성|파일 삭제|github|commit|push|배포|vercel|component|tsx|typescript|css)/i.test(prompt);
}

function asksToExecute(prompt: string) {
  return /(수정해|고쳐|고치세요|진행해|진행하세요|실행해|실행하세요|반영해|반영하세요|만들어|추가해|삭제해|배포해|승인|해줘|해주세요)/i.test(prompt);
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

function chooseDeveloperProvider(_prompt: string, providers?: AIProviderId[]) {
  const selected = (providers || []).find((id) => DEV_PROVIDER_NAMES[id]);
  return selected || "openai";
}

function developerProviderOrder(prompt: string, providers?: AIProviderId[]) {
  const selected = (providers || []).filter((id) => DEV_PROVIDER_NAMES[id]);
  const preferred = chooseDeveloperProvider(prompt, selected);
  const pool: AIProviderId[] = selected.length ? selected : ["openai", "anthropic", "google", "xai"];
  return [preferred, ...pool.filter((id) => id !== preferred)];
}

function developerModelName(provider: AIProviderId) {
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  if (provider === "google") return process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
  if (provider === "xai") return process.env.XAI_MODEL || "grok-2-latest";
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

async function fetchJsonWithTimeout(
  url: URL,
  init: RequestInit,
  timeoutMs: number,
  label: string,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let data: any = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      const preview = text.replace(/\s+/g, " ").slice(0, 180);
      throw new Error(`${label} returned non-JSON HTTP ${response.status}${preview ? `: ${preview}` : ""}`);
    }

    return { response, data };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function runDeveloper(request: Request, instruction: string, provider: AIProviderId) {
  const cookie = request.headers.get("cookie") || "";
  const path = provider === "google" ? "/api/dev/gemini" : "/api/dev/agent";
  const url = new URL(path, request.url);
  const headers = { "Content-Type": "application/json", cookie };
  const agentName = DEV_PROVIDER_NAMES[provider] || provider;
  const assignedInstruction = `${LIVING_RULES}\n\n${COUNTRY_BUILD_ORDER}\n\nSHARED COMPLETE USER ORDER — DO NOT SPLIT OR DROP CONTEXT:\n${instruction}\n\nRead the entire order, preserve dependencies between all requested work, and determine your own responsibility from the full context. If other AIs are named with different responsibilities, remain aware of those related responsibilities while performing your own part. Apply the newest approved order over any conflicting older instruction.`;

  const { response: reviewResponse, data: review } = await fetchJsonWithTimeout(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ instruction: assignedInstruction, provider }),
      cache: "no-store",
    },
    DEV_REVIEW_TIMEOUT_MS,
    `${agentName} development review`,
  );
  if (!reviewResponse.ok) {
    throw new Error(review.error || `${agentName} development review failed`);
  }

  const actions = Array.isArray(review.actions) ? review.actions : [];
  if (!asksToExecute(instruction)) {
    return {
      executed: false,
      summary: review.summary || `${agentName}가 수정안을 준비했습니다.`,
      actions,
      commits: [],
    };
  }

  const { response: executeResponse, data: executed } = await fetchJsonWithTimeout(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ instruction: assignedInstruction, provider, execute: true, actions }),
      cache: "no-store",
    },
    DEV_EXECUTE_TIMEOUT_MS,
    `${agentName} development execution`,
  );
  if (!executeResponse.ok) {
    throw new Error(executed.error || `${agentName} development execution failed`);
  }

  return {
    executed: true,
    summary: review.summary || `${agentName} 개발 작업을 실행했습니다.`,
    actions,
    commits: Array.isArray(executed.commits) ? executed.commits : [],
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = chatSchema.parse(body);
    const language = data.language || user.defaultLanguage;
    const routedProviders = resolvePromptProviders(data.prompt, data.providers);

    let result: any;

    if (looksLikeDevelopmentInstruction(data.prompt)) {
      const independent = await orchestrateRoom(data.roomId, {
        prompt: data.prompt,
        history: data.history,
        providers: routedProviders,
        language,
      });

      const agentOrder = developerProviderOrder(data.prompt, routedProviders);
      const failures: string[] = [];
      let executionSection = "";
      let executionProvider: AIProviderId | undefined;

      for (const provider of agentOrder) {
        const agentName = DEV_PROVIDER_NAMES[provider] || provider;
        try {
          const dev = await runDeveloper(request, data.prompt, provider);
          const changed = dev.actions.map((action: { operation?: string; path?: string }) => `${action.operation || "update"}: ${action.path || ""}`);
          const commitIds = dev.commits.map((item: { commit?: string }) => item.commit).filter(Boolean);

          executionProvider = provider;
          executionSection = dev.executed
            ? `### 실행 결과 — ${agentName}\n${agentName} 개발 Agent가 실제 작업을 완료했습니다.\n\n${dev.summary}${changed.length ? `\n\n작업 파일:\n- ${changed.join("\n- ")}` : ""}${commitIds.length ? `\n\nGitHub Commit:\n- ${commitIds.join("\n- ")}` : ""}\n\nVercel Git 연동으로 자동 배포가 진행됩니다.`
            : `### 실행 준비 — ${agentName}\n${agentName} 개발 Agent가 수정안을 준비했습니다.\n\n${dev.summary}${changed.length ? `\n\n수정 예정:\n- ${changed.join("\n- ")}` : ""}\n\n실행을 원하시면 ‘승인, 진행해’라고 지시해 주세요.`;
          break;
        } catch (devError) {
          const message = devError instanceof Error ? devError.message : `${agentName} development agent failed`;

          if (/development execution (?:timed out|returned non-JSON)/i.test(message)) {
            executionProvider = provider;
            executionSection = `### 실행 상태 — ${agentName}\n개발 실행 요청은 시작됐지만 서버가 제한 시간 안에 확정 결과를 반환하지 못했습니다. 중복 코드 변경을 막기 위해 다른 Agent로 자동 전환하지 않았습니다.\n\n확인 기록:\n- ${message}`;
            logger.warn("chat.developer_agent.execution_uncertain", {
              provider,
              agentName,
              message,
            });
            break;
          }

          failures.push(`${agentName}: ${message}`);
          logger.warn("chat.developer_agent.failover", {
            provider,
            agentName,
            message,
          });
        }
      }

      if (!executionSection) {
        executionSection = `### 실행 상태\n선택된 AI들의 독립 의견은 정상적으로 수집됐지만, 개발 Agent 실행은 모두 실패했습니다.\n\n실패 기록:\n- ${failures.join("\n- ")}`;
      } else if (failures.length) {
        executionSection += `\n\n자동 전환 기록:\n- ${failures.join("\n- ")}`;
      }

      result = {
        ...independent,
        finalAnswer: `${independent.finalAnswer}\n\n${executionSection}`,
        comparison: {
          ...independent.comparison,
          notes: [
            ...independent.comparison.notes,
            "Natural-language AI targeting overrides the UI selection when the user explicitly asks only named AIs to answer.",
            "The complete original user order was shared unchanged with every routed AI so dependencies and relationships are preserved.",
            "Each AI determines its own responsibility from the shared order rather than receiving an isolated split instruction.",
            "Living Rules apply to development execution: newer approved orders supersede conflicting older rules.",
            "All routed AIs gave independent opinions before development execution.",
            executionProvider
              ? `${DEV_PROVIDER_NAMES[executionProvider] || executionProvider} handled the development execution route.`
              : "All routed development-agent routes failed after automatic failover.",
          ],
        },
      };
    } else {
      result = await orchestrateRoom(data.roomId, {
        prompt: data.prompt,
        history: data.history,
        providers: routedProviders,
        language,
      });
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data: userMsg } = await supabase
        .from("messages")
        .insert({
          room_id: data.roomId,
          author_id: user.id,
          author_type: "user",
          content: data.prompt,
          language,
        })
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
        status: result.blocked
          ? "completed"
          : result.responses.some((r: { error?: string }) => r.error)
            ? "partial"
            : "completed",
        latency_ms: result.latencyMs,
        created_by: user.id,
      });

      return NextResponse.json({
        ...result,
        userMessage: userMsg,
        aiMessage: aiMsg,
      });
    }

    const userMessage = localDb.addMessage({
      roomId: data.roomId,
      authorType: "user",
      content: data.prompt,
      language,
    });
    const aiMessage = localDb.addMessage({
      roomId: data.roomId,
      authorType: "ai",
      content: result.finalAnswer,
      language,
      metadata: {
        blocked: result.blocked,
        comparison: result.comparison,
        providers: result.providers,
        responses: result.responses.map((r: { provider: string; model?: string; content: string; latencyMs: number; error?: string }) => ({
          provider: r.provider,
          model: r.model,
          content: r.content,
          latencyMs: r.latencyMs,
          error: r.error,
        })),
      },
    });

    logger.info("chat.completed", {
      roomId: data.roomId,
      latencyMs: result.latencyMs,
      blocked: result.blocked,
    });

    return NextResponse.json({
      ...result,
      userMessage,
      aiMessage,
    });
  } catch (error) {
    logger.error("chat.failed", {
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Chat orchestration failed" }, { status: 500 });
  }
}