import { logger } from "@/lib/logger";

export type ToolRiskTier = "read" | "safe_write" | "production" | "destructive" | "billing" | "secret";
export type ToolConnection = "connected" | "limited" | "not_connected";
export type ToolDecision = "allow" | "approval_required" | "deny";

export type ToolCapability = {
  id: string;
  label: string;
  connection: ToolConnection;
  risk: ToolRiskTier;
  description: string;
  execution: "host" | "git_integration" | "planned";
};

export type GatewayDecision = {
  decision: ToolDecision;
  capability: ToolCapability | null;
  reason: string;
};

const has = (name: string) => Boolean((process.env[name] || "").trim());

export function getToolCapabilities(): ToolCapability[] {
  const github = has("GITHUB_TOKEN");
  const supabase = has("NEXT_PUBLIC_SUPABASE_URL") && (has("SUPABASE_SERVICE_ROLE_KEY") || has("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const openai = has("OPENAI_API_KEY");
  const anthropic = has("ANTHROPIC_API_KEY");
  const gemini = has("GOOGLE_AI_API_KEY") || has("GEMINI_API_KEY") || has("GOOGLE_API_KEY");
  const grok = has("XAI_API_KEY");

  return [
    {
      id: "github.repo.read",
      label: "GitHub repository read",
      connection: github ? "connected" : "not_connected",
      risk: "read",
      description: "Read repository tree and approved source files. Secrets and credential files are excluded.",
      execution: github ? "host" : "planned",
    },
    {
      id: "github.file.write",
      label: "GitHub controlled file write",
      connection: github ? "connected" : "not_connected",
      risk: "safe_write",
      description: "Create or update allow-listed repository files through the existing developer-agent host route.",
      execution: github ? "host" : "planned",
    },
    {
      id: "github.file.delete",
      label: "GitHub file delete",
      connection: github ? "limited" : "not_connected",
      risk: "destructive",
      description: "Destructive repository changes are never silently authorised by a model.",
      execution: github ? "host" : "planned",
    },
    {
      id: "vercel.git_deploy",
      label: "Vercel deployment through Git integration",
      connection: github ? "limited" : "not_connected",
      risk: "production",
      description: "A GitHub change can trigger Vercel deployment. Deployment state must be verified separately before claiming success.",
      execution: github ? "git_integration" : "planned",
    },
    {
      id: "vercel.runtime.read",
      label: "Vercel runtime/build logs",
      connection: "not_connected",
      risk: "read",
      description: "No server-side Vercel management connector is currently exposed to Command Room models.",
      execution: "planned",
    },
    {
      id: "database.app",
      label: "Royal Command application database",
      connection: supabase ? "limited" : "not_connected",
      risk: "safe_write",
      description: "Application-level Supabase access may exist; schema/admin/destructive database authority is not granted to models by this gateway.",
      execution: supabase ? "host" : "planned",
    },
    {
      id: "ai.openai",
      label: "OpenAI provider",
      connection: openai ? "connected" : "not_connected",
      risk: "read",
      description: "Server-side OpenAI model invocation; API keys are never revealed to models.",
      execution: openai ? "host" : "planned",
    },
    {
      id: "ai.anthropic",
      label: "Anthropic provider",
      connection: anthropic ? "connected" : "not_connected",
      risk: "read",
      description: "Server-side Anthropic model invocation; API keys are never revealed to models.",
      execution: anthropic ? "host" : "planned",
    },
    {
      id: "ai.google",
      label: "Google Gemini provider",
      connection: gemini ? "connected" : "not_connected",
      risk: "read",
      description: "Server-side Gemini invocation; API keys are never revealed to models.",
      execution: gemini ? "host" : "planned",
    },
    {
      id: "ai.xai",
      label: "xAI Grok provider",
      connection: grok ? "connected" : "not_connected",
      risk: "read",
      description: "Server-side xAI invocation; API keys are never revealed to models.",
      execution: grok ? "host" : "planned",
    },
    {
      id: "email.gmail",
      label: "Gmail",
      connection: "not_connected",
      risk: "safe_write",
      description: "Not yet exposed as a Royal Command server-side execution connector.",
      execution: "planned",
    },
    {
      id: "calendar.google",
      label: "Google Calendar",
      connection: "not_connected",
      risk: "safe_write",
      description: "Not yet exposed as a Royal Command server-side execution connector.",
      execution: "planned",
    },
    {
      id: "files.drive",
      label: "Google Drive / managed files",
      connection: "not_connected",
      risk: "safe_write",
      description: "Not yet exposed as a Royal Command server-side execution connector.",
      execution: "planned",
    },
    {
      id: "telephony.manage",
      label: "Retell / Twilio / Crazytel",
      connection: "not_connected",
      risk: "production",
      description: "Telephony administration is intentionally unavailable until a scoped connector and approval policy are installed.",
      execution: "planned",
    },
    {
      id: "dns.manage",
      label: "Domain / DNS administration",
      connection: "not_connected",
      risk: "production",
      description: "Domain and DNS changes require a dedicated scoped connector and explicit approval.",
      execution: "planned",
    },
    {
      id: "billing.manage",
      label: "Billing / purchases",
      connection: "not_connected",
      risk: "billing",
      description: "Billing, purchases and plan changes are excluded from autonomous AI authority.",
      execution: "planned",
    },
    {
      id: "secret.read",
      label: "Secret values",
      connection: "not_connected",
      risk: "secret",
      description: "Secret values are never a model-readable capability. Only presence/status may be reported by trusted host code.",
      execution: "planned",
    },
  ];
}

export function evaluateToolPermission(capabilityId: string, options?: { owner?: boolean; approved?: boolean }): GatewayDecision {
  const capability = getToolCapabilities().find((item) => item.id === capabilityId) || null;
  if (!capability) return { decision: "deny", capability: null, reason: "Unknown capability" };
  if (capability.connection === "not_connected") {
    return { decision: "deny", capability, reason: "Capability is not connected to the Royal Command host" };
  }

  if (capability.risk === "secret" || capability.risk === "billing" || capability.risk === "destructive") {
    return { decision: "deny", capability, reason: `${capability.risk} authority is not delegated to autonomous AI execution` };
  }
  if (capability.risk === "production") {
    if (options?.owner && options.approved) return { decision: "allow", capability, reason: "Explicit owner approval verified" };
    return { decision: "approval_required", capability, reason: "Material production change requires Harry approval" };
  }
  if (capability.risk === "safe_write") {
    if (options?.owner) return { decision: "allow", capability, reason: "Owner-scoped safe write" };
    return { decision: "approval_required", capability, reason: "Write authority requires an authorised Royal Command operator" };
  }
  return { decision: "allow", capability, reason: "Read-only capability" };
}

export function toolGatewayModelContext() {
  const capabilities = getToolCapabilities();
  const connected = capabilities.filter((item) => item.connection !== "not_connected");
  const missing = capabilities.filter((item) => item.connection === "not_connected");

  return [
    "ROYAL COMMAND SHARED TOOL GATEWAY — HOST VERIFIED CAPABILITY MANIFEST",
    "This manifest describes host-side capabilities available to Royal Command. It does NOT reveal credentials and does NOT mean a model may bypass the host policy.",
    "Models may analyse and propose work. Actual changes occur only through a host execution route after policy checks. Never claim an action was executed until the host returns verified evidence.",
    "There is deliberately NO universal master credential. Credentials stay server-side and are separated by service and risk.",
    "Connected/limited capabilities:",
    ...connected.map((item) => `- ${item.id}: ${item.connection}; risk=${item.risk}; execution=${item.execution}; ${item.description}`),
    "Currently not connected to Command Room host execution:",
    ...missing.map((item) => `- ${item.id}: ${item.description}`),
    "Permission rules: read-only may be automatic; safe writes require an authorised operator; production changes require explicit Harry approval; destructive/billing/secret-value authority is denied to autonomous models.",
  ].join("\n");
}

export function auditToolGateway(event: string, meta: Record<string, unknown>) {
  logger.info(`tool_gateway.${event}`, meta);
}
