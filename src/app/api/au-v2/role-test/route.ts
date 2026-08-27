import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import type { AIProviderId } from "@/lib/ai/types";
import { AU_V2_COOKIE, isAustraliaV2Host, verifyAuV2SessionToken } from "@/lib/auV2TestSession";

const MAX_TASK = 30000;
const DEFAULT_TASK =
  "Royal Command RCA Room을 Global Core + Country Profile 구조로 발전시켜 여러 국가에서 동시에 안전하게 개발할 수 있도록 다음 개발 작업을 설계하라.";

type RoleResult = {
  provider: AIProviderId;
  role: string;
  content: string;
  latencyMs: number;
  error?: string;
};

async function runRole(
  provider: AIProviderId,
  role: string,
  system: string,
  task: string,
): Promise<RoleResult> {
  const started = Date.now();
  try {
    const result = await getConnector(provider).complete({
      messages: [
        { role: "system", content: system },
        { role: "user", content: task },
      ],
      temperature: 0.2,
      maxTokens: 900,
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
      error: error instanceof Error ? error.message : "Role test failed.",
    };
  }
}

export async function POST(request: Request) {
  if (!isAustraliaV2Host(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  if (!verifyAuV2SessionToken(cookieStore.get(AU_V2_COOKIE)?.value)) {
    return NextResponse.json({ error: "Australia V2 test session required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const requestedTask = typeof body.task === "string" ? body.task.trim() : "";
  const task = requestedTask || DEFAULT_TASK;
  if (task.length > MAX_TASK) {
    return NextResponse.json({ error: `Task must be ${MAX_TASK} characters or fewer.` }, { status: 400 });
  }

  const available = new Set(getAvailableProviderIds());
  const required: AIProviderId[] = ["openai", "google", "anthropic", "xai"];
  const missing = required.filter((id) => !available.has(id));
  if (missing.length) {
    return NextResponse.json(
      { error: `Required RCA providers are not connected: ${missing.join(", ")}` },
      { status: 503 },
    );
  }

  const planner = await runRole(
    "openai",
    "Planner / Task Controller",
    [
      "You are the RCA Planner and Task Controller.",
      "Break the user's order into clear work lanes and handoff points.",
      "Identify what can run in parallel and what must wait.",
      "Do not execute tools or modify files.",
      "Be concise and concrete, preferably under 500 Korean characters.",
    ].join(" "),
    task,
  );

  const architectureInput = [
    `ORIGINAL TASK:\n${task}`,
    `\nCHATGPT PLANNER RESULT:\n${planner.content || planner.error || "No planner result"}`,
  ].join("\n");
  const architect = await runRole(
    "google",
    "Architecture / Dependency",
    [
      "You are the RCA Architecture and Dependency controller.",
      "Check the planner result for dependency, shared-resource and file/data collision risks.",
      "State which work lanes may safely run in parallel and which require ordering or resource locks.",
      "Do not execute tools or modify files.",
      "Be concise and concrete, preferably under 500 Korean characters.",
    ].join(" "),
    architectureInput,
  );

  const writerInput = [
    `ORIGINAL TASK:\n${task}`,
    `\nPLANNER:\n${planner.content || planner.error || "No planner result"}`,
    `\nARCHITECTURE/DEPENDENCY:\n${architect.content || architect.error || "No architecture result"}`,
  ].join("\n");
  const writer = await runRole(
    "anthropic",
    "Writer Draft / Implementation",
    [
      "You are the RCA implementation Writer Draft agent.",
      "Using the approved plan and dependency constraints, produce the concrete implementation steps and files/components that a single authorized writer should change.",
      "This is verification-only: do not claim that files, branches, commits or deployments were actually changed.",
      "Be concise and concrete, preferably under 600 Korean characters.",
    ].join(" "),
    writerInput,
  );

  const redTeamInput = [
    `ORIGINAL TASK:\n${task}`,
    `\nPLANNER:\n${planner.content || planner.error || "No planner result"}`,
    `\nARCHITECTURE/DEPENDENCY:\n${architect.content || architect.error || "No architecture result"}`,
    `\nWRITER DRAFT:\n${writer.content || writer.error || "No writer result"}`,
  ].join("\n");
  const redTeam = await runRole(
    "xai",
    "Red-Team / Conflict Check",
    [
      "You are the RCA Red-Team reviewer.",
      "Challenge the plan, dependency map and writer draft.",
      "Find collision, missing dependency, security, rollback, race-condition and false-success risks.",
      "End with PASS or FIX REQUIRED and only the most important reasons.",
      "Do not execute tools or modify files.",
      "Be concise and concrete, preferably under 500 Korean characters.",
    ].join(" "),
    redTeamInput,
  );

  const results = [planner, architect, writer, redTeam];
  const passed = results.every((item) => item.content && !item.error);

  return NextResponse.json({
    ok: passed,
    mode: "ROLE_VERIFICATION_ONLY",
    writeAuthority: false,
    task,
    results,
  });
}
