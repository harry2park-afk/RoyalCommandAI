import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAvailableProviderIds, getConnector } from "@/lib/ai/connectors";
import type { AIProviderId } from "@/lib/ai/types";
import { AU_V2_COOKIE, isAustraliaV2Host, verifyAuV2SessionToken } from "@/lib/auV2TestSession";
import { verifyRcaBuildAuthenticatedUser } from "@/lib/rcaV2/buildAuth";
import { verifyRcaBuildTenantContext } from "@/lib/rcaV2/tenantContext";
import { evaluateRcaRuleGate, type RuleGateInput } from "@/lib/rcaV2/ruleGate";
import { validateRcaTaskPlan, type RcaTaskPlan, type RcaWorkLane } from "@/lib/rcaV2/masterTaskController";
import { buildRcaResourceLockPlan } from "@/lib/rcaV2/resourceLockPlan";

const MAX_TASK = 30000;
const PROVIDERS = new Set<AIProviderId>(["openai", "anthropic", "google", "xai"]);

function parsePlan(raw: string): RcaTaskPlan | null {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  try {
    const value = JSON.parse(cleaned) as Record<string, unknown>;
    if (typeof value.summary !== "string" || !Array.isArray(value.lanes)) return null;
    const lanes: RcaWorkLane[] = [];
    for (const item of value.lanes) {
      if (!item || typeof item !== "object") return null;
      const lane = item as Record<string, unknown>;
      if (typeof lane.id !== "string" || typeof lane.title !== "string" || typeof lane.writer !== "string") return null;
      if (!PROVIDERS.has(lane.writer as AIProviderId)) return null;
      lanes.push({
        id: lane.id,
        title: lane.title,
        writer: lane.writer as AIProviderId,
        reviewers: Array.isArray(lane.reviewers)
          ? lane.reviewers.filter((v): v is AIProviderId => typeof v === "string" && PROVIDERS.has(v as AIProviderId))
          : [],
        resources: Array.isArray(lane.resources) ? lane.resources.filter((v): v is string => typeof v === "string") : [],
        dependsOn: Array.isArray(lane.dependsOn) ? lane.dependsOn.filter((v): v is string => typeof v === "string") : [],
        parallelGroup: typeof lane.parallelGroup === "string" ? lane.parallelGroup : undefined,
        evidence: Array.isArray(lane.evidence) ? lane.evidence.filter((v): v is string => typeof v === "string") : [],
      });
    }
    return {
      summary: value.summary,
      lanes,
      integrationOrder: Array.isArray(value.integrationOrder)
        ? value.integrationOrder.filter((v): v is string => typeof v === "string")
        : [],
      rollbackPlan: typeof value.rollbackPlan === "string" ? value.rollbackPlan : "",
    };
  } catch {
    return null;
  }
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

  const availableProviders = getAvailableProviderIds();
  if (!availableProviders.includes("openai")) {
    return NextResponse.json({ error: "Planner provider is not connected." }, { status: 503 });
  }

  const auth = await verifyRcaBuildAuthenticatedUser();
  const tenant = await verifyRcaBuildTenantContext();
  const gateInput: RuleGateInput = {
    task,
    mode: "BUILD",
    countryCodes: Array.isArray(body.countryCodes) ? body.countryCodes.filter((v): v is string => typeof v === "string") : ["AU"],
    providers: availableProviders.filter((id): id is AIProviderId => PROVIDERS.has(id as AIProviderId)),
    resources: Array.isArray(body.resources) ? body.resources.filter((v): v is string => typeof v === "string") : [],
    evidencePlan: typeof body.evidencePlan === "string" ? body.evidencePlan : "Host-verified diff, tests, build, review and deployment evidence.",
    rollbackPoint: typeof body.rollbackPoint === "string" ? body.rollbackPoint : undefined,
    productionRequested: body.productionRequested === true,
    destructive: body.destructive === true,
    regulated: body.regulated === true,
  };
  const gate = evaluateRcaRuleGate(gateInput, {
    dedicatedSessionSecretConfigured: Boolean(process.env.AU_V2_SESSION_SECRET),
    authenticatedUserVerified: auth.authenticatedUserVerified,
    tenantIsolationVerified: tenant.verified,
    availableProviders,
  });

  const plannerPrompt = [
    "You are the RCA Master Task Planner. Return ONLY valid JSON, no markdown.",
    "This is planning-only. Never claim files, branches, commits, tests or deployments were executed.",
    "Break the task into isolated Work Lanes. A resource may belong to only one lane.",
    "Use only writers/reviewers from openai, anthropic, google, xai.",
    "Independent lanes may share a parallelGroup. Shared/core resources must be serialized through dependencies.",
    "Schema:",
    '{"summary":"...","lanes":[{"id":"L1","title":"...","writer":"openai","reviewers":["xai"],"resources":["exact/path/or/resource"],"dependsOn":[],"parallelGroup":"P1","evidence":["..."]}],"integrationOrder":["L1"],"rollbackPlan":"..."}',
    `TASK:\n${task}`,
  ].join("\n");

  const planner = await getConnector("openai").complete({
    messages: [
      { role: "system", content: "RCA planning-only Master Task Controller. Output strict JSON only." },
      { role: "user", content: plannerPrompt },
    ],
    temperature: 0.1,
    maxTokens: 1800,
  });

  const plan = parsePlan(planner.content || "");
  const validation = plan
    ? validateRcaTaskPlan(plan)
    : { valid: false, conflicts: ["Planner output was not valid RCA Task Plan JSON."], warnings: [] as string[] };
  const lockPlan = plan && validation.valid ? buildRcaResourceLockPlan(plan) : null;

  const executionEligible =
    validation.valid &&
    Boolean(lockPlan?.valid) &&
    (gate.disposition === "ALLOW" || gate.disposition === "ALLOW_WITH_CONDITIONS");

  return NextResponse.json({
    ok: Boolean(plan) && validation.valid && Boolean(lockPlan?.valid),
    mode: "BUILD_PLANNING_ONLY",
    writeAuthority: false,
    executionEligible,
    gate,
    readiness: {
      dedicatedSessionSecretConfigured: Boolean(process.env.AU_V2_SESSION_SECRET),
      authenticatedUserVerified: auth.authenticatedUserVerified,
      tenantIsolationVerified: tenant.verified,
      tenantConfigured: tenant.configured,
    },
    plan,
    validation,
    resourceLocks: lockPlan,
    planner: {
      provider: "openai",
      latencyMs: planner.latencyMs || 0,
      error: planner.error || null,
    },
  });
}
