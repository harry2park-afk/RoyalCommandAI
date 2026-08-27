import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import type { AIProviderId } from "@/lib/ai/types";
import { AU_V2_COOKIE, isAustraliaV2Host, verifyAuV2SessionToken } from "@/lib/auV2TestSession";
import { loadRcaRepositorySnapshot } from "@/lib/rcaV2/repositorySnapshot";

const MAX_TASK = 30000;
const REQUIRED: AIProviderId[] = ["openai", "google", "anthropic", "xai"];

type ReviewResult = {
  provider: AIProviderId;
  role: string;
  content: string;
  latencyMs: number;
  error?: string;
};

async function runReview(
  provider: AIProviderId,
  role: string,
  instruction: string,
  task: string,
  repositoryContext: string,
): Promise<ReviewResult> {
  const started = Date.now();
  try {
    const result = await getConnector(provider).complete({
      messages: [
        {
          role: "system",
          content: [
            `You are the RCA ${role}.`,
            "You are reviewing a host-supplied immutable repository snapshot.",
            "Treat only paths and contents in the snapshot as verified existing repository evidence.",
            "If you mention a path not present in the snapshot, label it NEW FILE or UNVERIFIED PATH.",
            "Do not browse, use tools, modify files, create branches/commits, deploy, or claim execution.",
            instruction,
          ].join(" "),
        },
        {
          role: "user",
          content: `TASK:\n${task}\n\nHOST-VERIFIED REPOSITORY SNAPSHOT:\n${repositoryContext}`,
        },
      ],
      temperature: 0.15,
      maxTokens: 1400,
    });
    return {
      provider,
      role,
      content: result.content?.trim() || "",
      latencyMs: result.latencyMs || Date.now() - started,
      ...(result.error ? { error: result.error } : {}),
    };
  } catch (error) {
    return {
      provider,
      role,
      content: "",
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Repository review failed.",
    };
  }
}

function snapshotText(snapshot: Awaited<ReturnType<typeof loadRcaRepositorySnapshot>>) {
  const header = [
    `Repository: ${snapshot.repository}`,
    `Commit SHA: ${snapshot.commitSha}`,
    `Tree truncated: ${snapshot.treeTruncated}`,
    `Missing requested paths: ${snapshot.missingPaths.length ? snapshot.missingPaths.join(", ") : "none"}`,
  ].join("\n");
  const files = snapshot.files.map((file) => [
    `\n===== FILE: ${file.path}${file.truncated ? " [TRUNCATED]" : ""} =====`,
    file.content,
  ].join("\n")).join("\n");
  return `${header}\n${files}`;
}

export async function POST(request: Request) {
  if (!isAustraliaV2Host(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cookieStore = await cookies();
  if (!verifyAuV2SessionToken(cookieStore.get(AU_V2_COOKIE)?.value)) {
    return NextResponse.json({ error: "Australia V2 test session required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const task = typeof body.task === "string" ? body.task.trim() : "";
  if (!task || task.length > MAX_TASK) {
    return NextResponse.json({ error: `Task must be between 1 and ${MAX_TASK} characters.` }, { status: 400 });
  }

  const available = new Set(getAvailableProviderIds());
  const missingProviders = REQUIRED.filter((provider) => !available.has(provider));
  if (missingProviders.length) {
    return NextResponse.json(
      { error: `Required RCA reviewers are not connected: ${missingProviders.join(", ")}` },
      { status: 503 },
    );
  }

  let snapshot: Awaited<ReturnType<typeof loadRcaRepositorySnapshot>>;
  try {
    snapshot = await loadRcaRepositorySnapshot(body.paths);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Repository snapshot failed closed." },
      { status: 502 },
    );
  }

  if (!snapshot.files.length) {
    return NextResponse.json({ error: "No verified repository files were available for review." }, { status: 400 });
  }

  const repositoryContext = snapshotText(snapshot);
  const reviews = await Promise.all([
    runReview(
      "openai",
      "Integration / Control Reviewer",
      "Check whether the requested work fits the current RCA control-plane structure, Rule Gate, execution boundaries and integration order. Identify exact verified files involved.",
      task,
      repositoryContext,
    ),
    runReview(
      "google",
      "Architecture / Dependency Reviewer",
      "Check architecture, dependencies, shared-resource collision, country/global-core boundaries and parallel-vs-serialized work. Cite verified file paths from the snapshot.",
      task,
      repositoryContext,
    ),
    runReview(
      "anthropic",
      "Code / Implementation Reviewer",
      "Review concrete code structure, type/API consistency, failure modes, security boundaries and likely implementation changes using only verified snapshot evidence.",
      task,
      repositoryContext,
    ),
    runReview(
      "xai",
      "Red-Team / Conflict Reviewer",
      "Challenge the proposal for unsafe assumptions, false-success, race conditions, authorization gaps, rollback gaps and repository-path hallucination. End with PASS or FIX REQUIRED.",
      task,
      repositoryContext,
    ),
  ]);

  const successful = reviews.filter((review) => review.content && !review.error);
  let integration: ReviewResult | null = null;
  if (successful.length >= 2) {
    const integrationInput = successful
      .map((review) => `\n===== ${review.role} / ${review.provider} =====\n${review.content}`)
      .join("\n");
    integration = await runReview(
      "openai",
      "Final Cross-Review Integrator",
      "Compare the independent findings. State consensus, conflicts, blockers, verified affected files, and the safest next action. Do not invent evidence and do not authorize execution.",
      `${task}\n\nINDEPENDENT REVIEWS:${integrationInput}`,
      repositoryContext,
    );
  }

  return NextResponse.json({
    ok: successful.length >= 2,
    mode: "REPOSITORY_GROUNDED_CROSS_REVIEW_ONLY",
    writeAuthority: false,
    executionAuthority: false,
    task,
    snapshot: {
      repository: snapshot.repository,
      commitSha: snapshot.commitSha,
      requestedPaths: snapshot.requestedPaths,
      reviewedPaths: snapshot.files.map((file) => file.path),
      missingPaths: snapshot.missingPaths,
      totalChars: snapshot.totalChars,
      treeTruncated: snapshot.treeTruncated,
    },
    reviews,
    integration,
  });
}
