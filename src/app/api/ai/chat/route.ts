import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { orchestrate } from "@/lib/ai/orchestrator";
import { chatSchema } from "@/lib/validations";
import { localDb } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const DEV_PROVIDER_NAMES: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
};

const COUNTRY_BUILD_ORDER = `ROYAL COMMAND COUNTRY BUILD ORDER — HARRY PARK APPROVED\nStart: 2026-08-15 Australia/Sydney.\nMission: Build Royal Command country-by-country as one cooperating AI engineering team. One lead AI owns one country, while all AIs help each other with their strongest capabilities. Reuse the latest approved common Royal Command base frame; do not rebuild from scratch.\nPhase 1 assignments:\n- ChatGPT: Australia lead. Finish and stabilise the common/base app frame first, and continue helping every other country lead with architecture, integration, debugging, security and shared components.\n- Gemini: United States lead.\n- Claude: United Kingdom lead.\n- Grok: Canada lead.\nCooperation rule: the country lead is accountable for completion, but must freely request and use help from other AIs. Avoid duplicate work. Shared improvements go back into the common frame for reuse by every country.\nCountry rule: clone/reuse the approved base frame and isolate only country-specific configuration, legal text, language, payments, telephony, identity, tax/compliance and integrations. Use a country-specific official Royal Command domain only after verifying Royal Command controls that domain and its DNS/hosting. Never invent domain ownership.\nSecurity: no universal master credential, no secrets in source, use least-privilege service credentials, preserve auditability, reversible deployments and Harry Park approval gates for material production changes.\nScale target: establish this pattern in Australia, USA, UK and Canada, then expand toward approximately 100 countries.\nPersistent reference: docs/ROYAL_COMMAND_COUNTRY_BUILD_ORDER.md.`;

function looksLikeDevelopmentInstruction(prompt: string) {
  return /(코드|개발|수정|고쳐|고치|버그|오류|ui|화면|레이아웃|사이드바|버튼|기능 추가|기능을 추가|파일 생성|파일 삭제|github|commit|push|배포|vercel|component|tsx|typescript|css)/i.test(prompt);
}

function asksToExecute(prompt: string) {
  return /(수정해|고쳐|고치세요|진행해|진행하세요|실행해|실행하세요|반영해|반영하세요|만들어|추가해|삭제해|배포해|승인|해줘|해주세요)/i.test(prompt);
}

function chooseDeveloperProvider(prompt: string, providers?: string[]) {
  if (/(claude|클로드)/i.test(prompt)) return "anthropic";
  if (/(gemini|제미나이)/i.test(prompt)) return "google";
  if (/(grok|그록)/i.test(prompt)) return "xai";
  if (/(chatgpt|openai|챗지피티)/i.test(prompt)) return "openai";
  const selected = (providers || []).find((id) => DEV_PROVIDER_NAMES[id]);
  return selected || "openai";
}

function developerModelName(provider: string) {
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  if (provider === "google") return process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
  if (provider === "xai") return process.env.XAI_MODEL || "grok-2-latest";
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

async function runDeveloper(request: Request, instruction: string, provider: string) {
  const cookie = request.headers.get("cookie") || "";
  const path = provider === "google" ? "/api/dev/gemini" : "/api/dev/agent";
  const url = new URL(path, request.url);
  const headers = { "Content-Type": "application/json", cookie };
  const agentName = DEV_PROVIDER_NAMES[provider] || provider;
  const assignedInstruction = `${COUNTRY_BUILD_ORDER}\n\nCURRENT USER INSTRUCTION:\n${instruction}`;

  const reviewResponse = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ instruction: assignedInstruction, provider }),
    cache: "no-store",
  });
  const review = await reviewResponse.json();
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

  const executeResponse = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ instruction: assignedInstruction, provider, execute: true, actions }),
    cache: "no-store",
  });
  const executed = await executeResponse.json();
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

    let result: any;

    if (looksLikeDevelopmentInstruction(data.prompt)) {
      const provider = chooseDeveloperProvider(data.prompt, data.providers);
      const agentName = DEV_PROVIDER_NAMES[provider] || provider;
      try {
        const dev = await runDeveloper(request, data.prompt, provider);
        const changed = dev.actions.map((action: { operation?: string; path?: string }) => `${action.operation || "update"}: ${action.path || ""}`);
        const commitIds = dev.commits.map((item: { commit?: string }) => item.commit).filter(Boolean);
        const finalAnswer = dev.executed
          ? `${agentName} 개발 Agent가 실제 작업을 완료했습니다.\n\n${dev.summary}${changed.length ? `\n\n작업 파일:\n- ${changed.join("\n- ")}` : ""}${commitIds.length ? `\n\nGitHub Commit:\n- ${commitIds.join("\n- ")}` : ""}\n\nVercel Git 연동으로 자동 배포가 진행됩니다.`
          : `${agentName} 개발 Agent가 수정안을 준비했습니다.\n\n${dev.summary}${changed.length ? `\n\n수정 예정:\n- ${changed.join("\n- ")}` : ""}\n\n실행을 원하시면 ‘승인, 진행해’라고 지시해 주세요.`;

        result = {
          finalAnswer,
          responses: [{
            provider,
            model: developerModelName(provider),
            content: finalAnswer,
            latencyMs: 0,
          }],
          providers: [provider],
          comparison: { winners: [provider], notes: [`${agentName} developer agent route`] },
          blocked: false,
          latencyMs: 0,
        };
      } catch (devError) {
        const message = devError instanceof Error ? devError.message : `${agentName} development agent failed`;
        result = {
          finalAnswer: `${agentName} 개발 Agent 실행 통로는 연결되어 있지만 현재 실행할 수 없습니다. 원인: ${message}`,
          responses: [{
            provider,
            model: developerModelName(provider),
            content: "",
            latencyMs: 0,
            error: message,
          }],
          providers: [provider],
          comparison: { winners: [], notes: [message] },
          blocked: false,
          latencyMs: 0,
        };
      }
    } else {
      result = await orchestrate({
        prompt: data.prompt,
        history: data.history,
        providers: data.providers,
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
