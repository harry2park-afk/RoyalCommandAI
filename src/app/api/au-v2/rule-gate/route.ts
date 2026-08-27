import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAvailableProviderIds } from "@/lib/ai/connectors";
import { AI_PROVIDER_IDS, type AIProviderId } from "@/lib/ai/types";
import { AU_V2_COOKIE, isAustraliaV2Host, verifyAuV2SessionToken } from "@/lib/auV2TestSession";
import { verifyRcaBuildAuthenticatedUser } from "@/lib/rcaV2/buildAuth";
import { evaluateRcaRuleGate, type RuleGateInput } from "@/lib/rcaV2/ruleGate";
import { verifyRcaBuildTenantContext } from "@/lib/rcaV2/tenantContext";

function isProviderId(value: unknown): value is AIProviderId {
  return typeof value === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function POST(request: Request) {
  if (!isAustraliaV2Host(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cookieStore = await cookies();
  if (!verifyAuV2SessionToken(cookieStore.get(AU_V2_COOKIE)?.value)) {
    return NextResponse.json({ error: "Australia V2 test session required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = body.mode === "FAST" ? "FAST" : "BUILD";
  const providers = Array.isArray(body.providers) ? body.providers.filter(isProviderId) : [];

  const input: RuleGateInput = {
    task: typeof body.task === "string" ? body.task : "",
    mode,
    countryCodes: strings(body.countryCodes),
    providers,
    resources: strings(body.resources),
    evidencePlan: typeof body.evidencePlan === "string" ? body.evidencePlan : undefined,
    rollbackPoint: typeof body.rollbackPoint === "string" ? body.rollbackPoint : undefined,
    productionRequested: body.productionRequested === true,
    destructive: body.destructive === true,
    regulated: body.regulated === true,
  };

  const auth = mode === "BUILD"
    ? await verifyRcaBuildAuthenticatedUser()
    : {
        supabaseConfigured: false,
        authenticatedUserVerified: false,
        userId: null,
      };

  const tenant = mode === "BUILD" && auth.authenticatedUserVerified
    ? await verifyRcaBuildTenantContext()
    : {
        configured: false,
        verified: false,
        roomId: null,
        tenantId: null,
      };

  const result = evaluateRcaRuleGate(input, {
    dedicatedSessionSecretConfigured: Boolean(process.env.AU_V2_SESSION_SECRET),
    authenticatedUserVerified: auth.authenticatedUserVerified,
    tenantIsolationVerified: tenant.verified,
    availableProviders: getAvailableProviderIds(),
  });

  return NextResponse.json({
    ok: result.disposition !== "BLOCK",
    gate: "RCA_V2_RULE_GATE",
    mode,
    readiness: {
      dedicatedSessionSecretConfigured: Boolean(process.env.AU_V2_SESSION_SECRET),
      supabaseConfigured: auth.supabaseConfigured,
      authenticatedUserVerified: auth.authenticatedUserVerified,
      tenantRoomConfigured: tenant.configured,
      tenantIsolationVerified: tenant.verified,
    },
    input: {
      task: input.task,
      countryCodes: input.countryCodes || [],
      providers,
      resources: input.resources || [],
      productionRequested: Boolean(input.productionRequested),
      destructive: Boolean(input.destructive),
      regulated: Boolean(input.regulated),
    },
    ...result,
  });
}
