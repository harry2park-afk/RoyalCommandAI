import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import { DEV_PROVIDER_IDS, DEV_PROVIDER_NAMES } from "@/lib/ai/executionRouting";
import type { AIProviderId } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const requestSchema = z.object({
  roomId: z.string().uuid(),
  workRecordId: z.string().uuid(),
  laneId: z.string().min(1).max(80),
  instruction: z.string().min(3).max(30000),
  leaseSeconds: z.number().int().min(60).max(3600).default(1800),
});

type DevAction = Record<string, unknown>;
type ReviewResult = { provider: AIProviderId; name: string; content: string; error?: string };

type LaneRow = {
  id: string;
  lane_id: string;
  title: string;
  writer_provider: string;
  reviewer_providers: string[];
  resources: string[];
  depends_on: string[];
  required_evidence: string[];
  status: string;
  rework_round: number;
};

type WorkRow = {
  id: string;
  room_id: string;
  work_id: string;
  revision: number;
  status: string;
};

function asProvider(value: string): AIProviderId | null {
  return (DEV_PROVIDER_IDS as readonly string[]).includes(value) ? value as AIProviderId : null;
}

function reviewPacket(actions: DevAction[]) {
  const limit = 36000;
  let used = 0;
  const output: string[] = [];
  for (const action of actions) {
    const path = String(action.path || "");
    const operation = String(action.operation || "update");
    const reason = String(action.reason || "");
    const content = typeof action.content === "string" ? action.content : "";
    const header = `FILE: ${path}\nOPERATION: ${operation}\nREASON: ${reason}`;
    const remaining = Math.max(0, limit - used - header.length - 40);
    const body = content.slice(0, remaining);
    output.push(`${header}\nCONTENT:\n${body}${body.length < content.length ? "\n[HOST REVIEW PACKET TRUNCATED]" : ""}`);
    used += header.length + body.length + 40;
    if (used >= limit) break;
  }
  return output.join("\n\n---\n\n");
}

function hasRework(content: string) {
  return /VERDICT\s*:\s*(?:REWORK|FIX_REQUIRED|BLOCKED)/i.test(content);
}

function finalVerdict(reviews: ReviewResult[]): "pass" | "fix_required" | "blocked" {
  const usable = reviews.filter((review) => !review.error && review.content.trim());
  if (!usable.length || reviews.some((review) => review.error)) return "blocked";
  if (usable.some((review) => /VERDICT\s*:\s*BLOCKED/i.test(review.content))) return "blocked";
  if (usable.some((review) => /VERDICT\s*:\s*(?:FIX_REQUIRED|REWORK)/i.test(review.content))) return "fix_required";
  return usable.every((review) => /VERDICT\s*:\s*PASS/i.test(review.content)) ? "pass" : "fix_required";
}

async function reviewWithProvider(provider: AIProviderId, prompt: string): Promise<ReviewResult> {
  const name = DEV_PROVIDER_NAMES[provider] || provider;
  try {
    const connector = getConnector(provider);
    if (!connector.isConfigured()) throw new Error(`${name} is not connected`);
    const response = await connector.complete({
      messages: [
        { role: "system", content: "You are an independent Royal Command code reviewer. You are read-only. Never claim to write, commit, push, merge or deploy. Follow the requested verdict format exactly." },
        { role: "user", content: prompt },
      ],
      temperature: 0.05,
      maxTokens: 3000,
    });
    if (response.error) throw new Error(response.error);
    if (!response.content?.trim()) throw new Error(`${name} returned an empty review`);
    return { provider, name, content: response.content.trim() };
  } catch (error) {
    return { provider, name, content: "", error: error instanceof Error ? error.message : String(error) };
  }
}

export async function POST(request: Request) {
  let cleanup: { roomId: string; workRecordId: string; laneId: string; tokens: string[] } | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory Host execution requires the configured RCA database." }, { status: 503 });
    }

    const input = requestSchema.parse(await request.json());
    const supabase = await createClient();

    const { data: workData, error: workError } = await supabase
      .from("room_work_records")
      .select("id, room_id, work_id, revision, status")
      .eq("id", input.workRecordId)
      .eq("room_id", input.roomId)
      .single();
    if (workError || !workData) return NextResponse.json({ error: "Work record not found or Room access denied." }, { status: 404 });
    const work = workData as WorkRow;
    if (!/^RC-FACTORY-[A-Z0-9-]+$/i.test(work.work_id)) {
      return NextResponse.json({ error: "This Work record predates the executable Room Factory Work-ID contract. Prepare a new Factory Work." }, { status: 409 });
    }

    const { data: laneData, error: laneError } = await supabase
      .from("room_work_lanes")
      .select("id, lane_id, title, writer_provider, reviewer_providers, resources, depends_on, required_evidence, status, rework_round")
      .eq("room_id", input.roomId)
      .eq("work_record_id", input.workRecordId)
      .eq("lane_id", input.laneId)
      .single();
    if (laneError || !laneData) return NextResponse.json({ error: "Work Lane not found." }, { status: 404 });
    const lane = laneData as LaneRow;

    const writer = asProvider(String(lane.writer_provider || "").toLowerCase());
    if (!writer) return NextResponse.json({ error: "Work Lane Writer is not an enabled developer AI." }, { status: 409 });

    const available = new Set(getAvailableProviderIds());
    if (!available.has(writer)) return NextResponse.json({ error: `${DEV_PROVIDER_NAMES[writer] || writer} Writer is not connected.` }, { status: 409 });
    const reviewers = (lane.reviewer_providers || [])
      .map((provider) => asProvider(String(provider).toLowerCase()))
      .filter((provider): provider is AIProviderId => Boolean(provider && provider !== writer && available.has(provider)));
    if (!reviewers.length) return NextResponse.json({ error: "At least one connected independent Reviewer is required." }, { status: 409 });

    const { data: startData, error: startError } = await supabase.rpc("start_room_factory_lane_execution", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: input.laneId,
      p_lease_seconds: input.leaseSeconds,
    });
    if (startError) return NextResponse.json({ error: startError.message }, { status: 409 });
    const locks = Array.isArray(startData) ? startData : [];
    const lockTokens = locks.map((lock) => String(lock?.lock_token || "")).filter(Boolean);
    if (!locks.length || lockTokens.length !== locks.length || locks.some((lock) => lock?.lane_status !== "running")) {
      return NextResponse.json({ error: "Host failed to acquire complete execution lock evidence." }, { status: 500 });
    }
    cleanup = { roomId: input.roomId, workRecordId: input.workRecordId, laneId: input.laneId, tokens: lockTokens };

    const writerName = DEV_PROVIDER_NAMES[writer] || writer;
    const verifiedInstruction = [
      "ROYAL COMMAND ROOM FACTORY — HOST VERIFIED LANE EXECUTION",
      `Work ID: ${work.work_id}`,
      `Revision: ${work.revision}`,
      `Room ID: ${input.roomId}`,
      `Work Lane: ${lane.lane_id} — ${lane.title}`,
      `Single Write Authority: ${writerName} is the only provider allowed to write for this Work Lane.`,
      `Reviewer providers: ${reviewers.map((provider) => DEV_PROVIDER_NAMES[provider] || provider).join(", ")}.`,
      `Declared resource boundary: ${(lane.resources || []).join(", ")}.`,
      `Required evidence: ${(lane.required_evidence || []).join(", ")}.`,
      "Other AIs are REVIEW ONLY. They may not modify files, commit, push, merge or deploy.",
      "Use only the safe Work-ID branch. Never write directly to master.",
      "Production merge/deploy is prohibited in this execution.",
      "Preserve existing working features. Make the smallest coherent change that satisfies this Work Lane and the user instruction.",
      "",
      "USER / FACTORY INSTRUCTION:",
      input.instruction,
    ].join("\n");

    const cookie = request.headers.get("cookie") || "";
    const callDevAgent = async (body: Record<string, unknown>) => {
      const response = await fetch(new URL("/api/dev/agent", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Developer agent HTTP ${response.status}`);
      return payload;
    };

    let plan = await callDevAgent({ provider: writer, instruction: verifiedInstruction });
    let actions: DevAction[] = Array.isArray(plan?.actions) ? plan.actions : [];
    if (!actions.length) throw new Error(`${writerName} returned no executable file actions.`);

    const preReviewPrompt = [
      "ROYAL COMMAND ROOM FACTORY PRE-COMMIT REVIEW — READ ONLY",
      `Work ID: ${work.work_id}`,
      `Lane: ${lane.lane_id} — ${lane.title}`,
      `Writer: ${writerName}`,
      "Review the exact proposed actions against the user instruction and declared Work Lane.",
      "Do not broaden scope. Identify only material defects, regressions, security problems, missing requirements or unnecessary changes.",
      "Return exactly VERDICT: PASS or VERDICT: REWORK, followed by concise P0/P1/P2 findings.",
      "",
      "USER / FACTORY INSTRUCTION:", input.instruction,
      "",
      "PROPOSED ACTIONS:", reviewPacket(actions),
    ].join("\n");
    const preReviews = await Promise.all(reviewers.map((provider) => reviewWithProvider(provider, preReviewPrompt)));

    if (preReviews.some((review) => !review.error && hasRework(review.content))) {
      const feedback = preReviews
        .map((review) => `### ${review.name}\n${review.error ? `REVIEW ERROR: ${review.error}` : review.content}`)
        .join("\n\n");
      const refineInstruction = [
        verifiedInstruction,
        "",
        "ROYAL COMMAND ROOM FACTORY — ONE BOUNDED REFINEMENT PASS",
        "Independent reviewers found issues in the proposed actions. Fix valid material findings only; reject irrelevant suggestions; do not broaden scope.",
        feedback,
      ].join("\n");
      plan = await callDevAgent({ provider: writer, instruction: refineInstruction });
      actions = Array.isArray(plan?.actions) ? plan.actions : [];
      if (!actions.length) throw new Error(`${writerName} returned no executable actions after refinement.`);
    }

    const executed = await callDevAgent({ provider: writer, instruction: verifiedInstruction, execute: true, actions });
    if (executed?.evidenceVerified !== true) throw new Error("Writer execution returned without verified Commit Evidence.");
    const commits = Array.isArray(executed?.commits) ? executed.commits : [];
    if (!commits.length || commits.some((commit: Record<string, unknown>) => !String(commit?.commit || ""))) {
      throw new Error("Commit Evidence is incomplete.");
    }

    const { data: released, error: releaseError } = await supabase.rpc("release_room_factory_lane_locks", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: input.laneId,
      p_lock_tokens: lockTokens,
    });
    if (releaseError || Number(released || 0) !== lockTokens.length) {
      throw new Error(releaseError?.message || "Complete Resource Lock release evidence was not returned.");
    }
    cleanup = null;

    const evidence = {
      workId: work.work_id,
      revision: work.revision,
      roomId: input.roomId,
      laneId: lane.lane_id,
      writer,
      branch: String(executed?.branch || ""),
      commits,
      changedFiles: commits.map((commit: Record<string, unknown>) => String(commit?.path || "")).filter(Boolean),
      preReviews: preReviews.map((review) => ({ provider: review.provider, content: review.content, error: review.error || null })),
      productionMergePerformed: false,
      lockTokensReleased: lockTokens.length,
      recordedAt: new Date().toISOString(),
    };

    const { data: evidenceData, error: evidenceError } = await supabase.rpc("submit_room_factory_lane_evidence", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: input.laneId,
      p_evidence: evidence,
    });
    if (evidenceError) throw new Error(evidenceError.message);
    const evidenceRow = Array.isArray(evidenceData) ? evidenceData[0] : evidenceData;
    if (evidenceRow?.lane_status !== "awaiting_review") throw new Error("Evidence Gate did not move the Work Lane to awaiting_review.");

    const finalReviewPrompt = [
      "ROYAL COMMAND ROOM FACTORY FINAL EVIDENCE REVIEW — READ ONLY",
      `Work ID: ${work.work_id}`,
      `Lane: ${lane.lane_id} — ${lane.title}`,
      `Writer: ${writerName}`,
      "Review the executed safe-branch result and Host Commit Evidence. Production was not merged.",
      "Return exactly one of VERDICT: PASS, VERDICT: FIX_REQUIRED, or VERDICT: BLOCKED, then concise material findings.",
      "PASS only if the requested scope is met and the evidence shown is sufficient. Do not invent evidence.",
      "",
      "USER / FACTORY INSTRUCTION:", input.instruction,
      "",
      "FINAL ACTIONS:", reviewPacket(actions),
      "",
      "HOST COMMIT EVIDENCE:", JSON.stringify(evidence),
    ].join("\n");
    const finalReviews = await Promise.all(reviewers.map((provider) => reviewWithProvider(provider, finalReviewPrompt)));
    const verdict = finalVerdict(finalReviews);
    const gateReviewer = finalReviews.find((review) => !review.error)?.provider || reviewers[0];

    const { data: verdictData, error: verdictError } = await supabase.rpc("review_room_factory_lane", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: input.laneId,
      p_reviewer_provider: gateReviewer,
      p_verdict: verdict,
      p_notes: {
        aggregateVerdict: verdict,
        independentReviews: finalReviews.map((review) => ({ provider: review.provider, content: review.content, error: review.error || null })),
      },
    });
    if (verdictError) throw new Error(verdictError.message);
    const verdictRow = Array.isArray(verdictData) ? verdictData[0] : verdictData;

    return NextResponse.json({
      work: { workId: work.work_id, revision: work.revision, workRecordId: input.workRecordId },
      lane: { laneId: lane.lane_id, title: lane.title, status: verdictRow?.lane_status || verdict, reworkRound: verdictRow?.rework_round ?? lane.rework_round },
      writer: { provider: writer, name: writerName, branch: executed.branch, commits },
      reviewers: finalReviews,
      preReviews,
      refinementApplied: preReviews.some((review) => !review.error && hasRework(review.content)),
      evidence,
      finalVerdict: verdict,
      productionMergePerformed: false,
      status: verdict === "pass" ? "PASS" : verdict === "fix_required" ? "FIX_REQUIRED" : "BLOCKED",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Room Factory Host execution failed.";
    if (cleanup) {
      try {
        const supabase = await createClient();
        await supabase.rpc("fail_room_factory_lane_execution", {
          p_room_id: cleanup.roomId,
          p_work_record_id: cleanup.workRecordId,
          p_lane_id: cleanup.laneId,
          p_lock_tokens: cleanup.tokens,
          p_error: message,
        });
      } catch {
        // Preserve the original execution failure. Stale leases still expire automatically.
      }
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
