import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import { DEV_PROVIDER_IDS, DEV_PROVIDER_NAMES } from "@/lib/ai/executionRouting";
import type { AIProviderId } from "@/lib/ai/types";
import { evaluateFactoryQaEvidence } from "@/lib/rooms/factoryQaGate";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const requestSchema = z.object({
  roomId: z.string().uuid(),
  workRecordId: z.string().uuid(),
  leaseSeconds: z.number().int().min(60).max(3600).default(900),
});

const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BASE_BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const REPO_OWNER = REPO.split("/")[0] || "harry2park-afk";

type ReviewResult = { provider: AIProviderId; name: string; content: string; error?: string };

type WorkRow = {
  id: string;
  room_id: string;
  work_id: string;
  revision: number;
};

type LaneRow = {
  id: string;
  lane_id: string;
  title: string;
  writer_provider: string;
  reviewer_providers: string[];
  depends_on: string[];
  status: string;
  rework_round: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function asProvider(value: string): AIProviderId | null {
  return (DEV_PROVIDER_IDS as readonly string[]).includes(value) ? value as AIProviderId : null;
}

function workBranch(workId: string, revision: number, provider: AIProviderId) {
  const safeWork = workId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  return `rc-work/${safeWork}/${provider}-rev-${String(revision).padStart(2, "0")}`;
}

async function githubJson(path: string): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured in the Royal Command server environment");
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  const text = await response.text();
  let payload: unknown = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!response.ok) {
    const message = String(asRecord(payload).message || `GitHub HTTP ${response.status}`);
    throw new Error(message);
  }
  return payload;
}

async function reviewWithProvider(provider: AIProviderId, prompt: string): Promise<ReviewResult> {
  const name = DEV_PROVIDER_NAMES[provider] || provider;
  try {
    const connector = getConnector(provider);
    if (!connector.isConfigured()) throw new Error(`${name} is not connected`);
    const response = await connector.complete({
      messages: [
        {
          role: "system",
          content: "You are an independent Royal Command release reviewer. You are READ ONLY. Never claim to write, commit, push, merge or deploy. Judge only the host evidence supplied. Return the requested verdict format exactly.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.05,
      maxTokens: 3000,
    });
    if (response.error) throw new Error(response.error);
    if (!response.content?.trim()) throw new Error(`${name} returned an empty QA review`);
    return { provider, name, content: response.content.trim() };
  } catch (error) {
    return { provider, name, content: "", error: error instanceof Error ? error.message : String(error) };
  }
}

function aggregateVerdict(reviews: ReviewResult[]): "pass" | "fix_required" | "blocked" {
  const usable = reviews.filter((review) => !review.error && review.content.trim());
  if (!usable.length || reviews.some((review) => review.error)) return "blocked";
  if (usable.some((review) => /VERDICT\s*:\s*BLOCKED/i.test(review.content))) return "blocked";
  if (usable.some((review) => /VERDICT\s*:\s*(?:FIX_REQUIRED|REWORK)/i.test(review.content))) return "fix_required";
  return usable.every((review) => /VERDICT\s*:\s*PASS/i.test(review.content)) ? "pass" : "fix_required";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory QA requires the configured RCA database." }, { status: 503 });
    }

    const input = requestSchema.parse(await request.json());
    const supabase = await createClient();

    const { data: workData, error: workError } = await supabase
      .from("room_work_records")
      .select("id, room_id, work_id, revision")
      .eq("id", input.workRecordId)
      .eq("room_id", input.roomId)
      .single();
    if (workError || !workData) return NextResponse.json({ error: "Work record not found or Room access denied." }, { status: 404 });
    const work = workData as WorkRow;
    if (!/^RC-FACTORY-[A-Z0-9-]+$/i.test(work.work_id)) {
      return NextResponse.json({ error: "QA Release Gate requires an executable RC-FACTORY Work." }, { status: 409 });
    }

    const { data: laneData, error: laneError } = await supabase
      .from("room_work_lanes")
      .select("id, lane_id, title, writer_provider, reviewer_providers, depends_on, status, rework_round")
      .eq("room_id", input.roomId)
      .eq("work_record_id", input.workRecordId)
      .eq("lane_id", "qa")
      .single();
    if (laneError || !laneData) return NextResponse.json({ error: "QA Work Lane not found." }, { status: 404 });
    const lane = laneData as LaneRow;
    if (lane.status === "passed") {
      return NextResponse.json({ status: "PASS", finalVerdict: "pass", alreadyPassed: true, work: { workId: work.work_id, revision: work.revision }, lane: { laneId: "qa", status: "passed" }, productionMergePerformed: false });
    }

    const { data: allLanes, error: dependencyError } = await supabase
      .from("room_work_lanes")
      .select("lane_id, status")
      .eq("room_id", input.roomId)
      .eq("work_record_id", input.workRecordId);
    if (dependencyError) return NextResponse.json({ error: dependencyError.message }, { status: 500 });
    const laneStatus = new Map((allLanes || []).map((item) => [String(item.lane_id), String(item.status)]));
    const unmet = (lane.depends_on || []).filter((id) => laneStatus.get(id) !== "passed");
    if (unmet.length) {
      return NextResponse.json({ status: "WAITING_FOR_LANES", unmetDependencies: unmet, laneStatuses: Object.fromEntries(laneStatus) }, { status: 409 });
    }

    const writer = asProvider(String(lane.writer_provider || "").toLowerCase());
    if (!writer) return NextResponse.json({ error: "QA Lane Writer metadata is invalid." }, { status: 409 });
    const available = new Set(getAvailableProviderIds());
    const reviewers = (lane.reviewer_providers || [])
      .map((provider) => asProvider(String(provider).toLowerCase()))
      .filter((provider): provider is AIProviderId => Boolean(provider && provider !== writer && available.has(provider)));
    if (!reviewers.length) return NextResponse.json({ error: "At least one connected independent QA Reviewer is required." }, { status: 409 });

    const branch = workBranch(work.work_id, work.revision, writer);
    let refPayload: unknown;
    try {
      refPayload = await githubJson(`/git/ref/heads/${encodeURIComponent(branch)}`);
    } catch (error) {
      return NextResponse.json({ status: "WAITING_FOR_SAFE_BRANCH", branch, error: error instanceof Error ? error.message : String(error) }, { status: 409 });
    }
    const headSha = String(asRecord(asRecord(refPayload).object).sha || "");
    if (!headSha) return NextResponse.json({ status: "WAITING_FOR_SAFE_BRANCH", branch, error: "Safe branch HEAD is unavailable." }, { status: 409 });

    const pullList = await githubJson(`/pulls?head=${encodeURIComponent(`${REPO_OWNER}:${branch}`)}&base=${encodeURIComponent(BASE_BRANCH)}&state=open&per_page=10`);
    const pulls = Array.isArray(pullList) ? pullList : [];
    if (!pulls.length) return NextResponse.json({ status: "WAITING_FOR_PR", branch, headSha }, { status: 409 });
    const listedPr = asRecord(pulls[0]);
    const prNumber = Number(listedPr.number || 0);
    if (!prNumber) return NextResponse.json({ status: "WAITING_FOR_PR", branch, headSha }, { status: 409 });

    const prPayload = asRecord(await githubJson(`/pulls/${prNumber}`));
    if (prPayload.mergeable === null || typeof prPayload.mergeable === "undefined") {
      return NextResponse.json({ status: "WAITING_FOR_MERGEABILITY", branch, headSha, prNumber }, { status: 409 });
    }
    if (prPayload.mergeable !== true) {
      return NextResponse.json({ status: "BLOCKED", error: "Safe Work PR is not mergeable with current master.", branch, headSha, prNumber }, { status: 409 });
    }

    const runsPayload = asRecord(await githubJson(`/actions/runs?branch=${encodeURIComponent(branch)}&event=pull_request&per_page=100`));
    const runs = Array.isArray(runsPayload.workflow_runs) ? runsPayload.workflow_runs : [];
    const workflowRuns = runs
      .map((run) => asRecord(run))
      .filter((run) => String(run.head_sha || "") === headSha)
      .map((run) => ({
        name: String(run.name || ""),
        status: String(run.status || ""),
        conclusion: run.conclusion == null ? null : String(run.conclusion),
        htmlUrl: String(run.html_url || ""),
      }));

    const statusPayload = asRecord(await githubJson(`/commits/${headSha}/status`));
    const statuses = Array.isArray(statusPayload.statuses) ? statusPayload.statuses : [];
    const commitStatuses = statuses.map((status) => {
      const value = asRecord(status);
      return { context: String(value.context || ""), state: String(value.state || ""), targetUrl: String(value.target_url || "") };
    });
    const gate = evaluateFactoryQaEvidence(workflowRuns, commitStatuses);
    if (!gate.ready) {
      return NextResponse.json({ status: "WAITING_FOR_QA_EVIDENCE", branch, headSha, prNumber, gate }, { status: 409 });
    }

    const filesPayload = await githubJson(`/pulls/${prNumber}/files?per_page=100`);
    const files = Array.isArray(filesPayload) ? filesPayload : [];
    let diffChars = 0;
    const diffSections: string[] = [];
    for (const raw of files) {
      const file = asRecord(raw);
      const header = `FILE: ${String(file.filename || "")}\nSTATUS: ${String(file.status || "")}\n+${Number(file.additions || 0)} -${Number(file.deletions || 0)}`;
      const patch = String(file.patch || "");
      const remaining = Math.max(0, 40000 - diffChars - header.length - 20);
      const body = patch.slice(0, remaining);
      diffSections.push(`${header}\n${body}${body.length < patch.length ? "\n[HOST DIFF TRUNCATED]" : ""}`);
      diffChars += header.length + body.length + 20;
      if (diffChars >= 40000) break;
    }

    const { data: startData, error: startError } = await supabase.rpc("start_room_factory_lane_execution", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: "qa",
      p_lease_seconds: input.leaseSeconds,
    });
    if (startError) return NextResponse.json({ error: startError.message }, { status: 409 });
    const locks = Array.isArray(startData) ? startData : [];
    const lockTokens = locks.map((lock) => String(lock?.lock_token || "")).filter(Boolean);
    if (!locks.length || lockTokens.length !== locks.length) throw new Error("QA lock evidence is incomplete.");

    const { data: released, error: releaseError } = await supabase.rpc("release_room_factory_lane_locks", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: "qa",
      p_lock_tokens: lockTokens,
    });
    if (releaseError || Number(released || 0) !== lockTokens.length) throw new Error(releaseError?.message || "QA lock release evidence is incomplete.");

    const evidence = {
      workId: work.work_id,
      revision: work.revision,
      roomId: input.roomId,
      laneId: "qa",
      mode: "read-only-release-gate",
      writer,
      branch,
      branchHeadSha: headSha,
      pullRequest: { number: prNumber, url: String(prPayload.html_url || ""), mergeable: true, base: BASE_BRANCH },
      changedFiles: files.map((file) => String(asRecord(file).filename || "")).filter(Boolean),
      repositoryGates: gate.workflowEvidence,
      vercel: gate.vercel,
      qaWritePerformed: false,
      productionMergePerformed: false,
      lockTokensReleased: lockTokens.length,
      recordedAt: new Date().toISOString(),
    };

    const { data: evidenceData, error: evidenceError } = await supabase.rpc("submit_room_factory_lane_evidence", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: "qa",
      p_evidence: evidence,
    });
    if (evidenceError) throw new Error(evidenceError.message);
    const evidenceRow = Array.isArray(evidenceData) ? evidenceData[0] : evidenceData;
    if (evidenceRow?.lane_status !== "awaiting_review") throw new Error("QA Evidence Gate did not enter awaiting_review.");

    const reviewPrompt = [
      "ROYAL COMMAND ROOM FACTORY QA RELEASE REVIEW — READ ONLY",
      `Work ID: ${work.work_id}`,
      `Revision: ${work.revision}`,
      `Room ID: ${input.roomId}`,
      `Safe branch: ${branch}`,
      `Safe branch HEAD: ${headSha}`,
      `PR: #${prNumber} ${String(prPayload.html_url || "")}`,
      "Production has NOT been merged or deployed by Room Factory.",
      "Review only the Host evidence and diff below. Do not invent missing facts.",
      "Return exactly VERDICT: PASS, VERDICT: FIX_REQUIRED, or VERDICT: BLOCKED, followed by concise material findings.",
      "PASS only if repository gates and Vercel succeeded, the PR is mergeable, scope appears coherent, and no material regression/security problem is visible.",
      "",
      "HOST QA EVIDENCE:",
      JSON.stringify(evidence),
      "",
      "SAFE BRANCH DIFF:",
      diffSections.join("\n\n---\n\n"),
    ].join("\n");

    const reviews = await Promise.all(reviewers.map((provider) => reviewWithProvider(provider, reviewPrompt)));
    const verdict = aggregateVerdict(reviews);
    const gateReviewer = reviews.find((review) => !review.error)?.provider || reviewers[0];
    const { data: verdictData, error: verdictError } = await supabase.rpc("review_room_factory_lane", {
      p_room_id: input.roomId,
      p_work_record_id: input.workRecordId,
      p_lane_id: "qa",
      p_reviewer_provider: gateReviewer,
      p_verdict: verdict,
      p_notes: {
        aggregateVerdict: verdict,
        independentReviews: reviews.map((review) => ({ provider: review.provider, content: review.content, error: review.error || null })),
        hostQaEvidence: evidence,
      },
    });
    if (verdictError) throw new Error(verdictError.message);
    const verdictRow = Array.isArray(verdictData) ? verdictData[0] : verdictData;

    return NextResponse.json({
      status: verdict === "pass" ? "PASS" : verdict === "fix_required" ? "FIX_REQUIRED" : "BLOCKED",
      finalVerdict: verdict,
      work: { workId: work.work_id, revision: work.revision, workRecordId: input.workRecordId },
      lane: { laneId: "qa", title: lane.title, status: verdictRow?.lane_status || verdict, reworkRound: verdictRow?.rework_round ?? lane.rework_round },
      branch,
      headSha,
      pullRequest: evidence.pullRequest,
      gate,
      evidence,
      reviewers: reviews,
      productionMergePerformed: false,
      qaWritePerformed: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory QA Release Gate failed." }, { status: 500 });
  }
}
