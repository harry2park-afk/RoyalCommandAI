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
  const vercel = has("VERCEL_TOKEN");
  const supabase = has("NEXT_PUBLIC_SUPABASE_URL") && has("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const openai = has("OPENAI_API_KEY");
  const anthropic = has("ANTHROPIC_API_KEY");
  const gemini = has("GOOGLE_AI_API_KEY") || has("GEMINI_API_KEY") || has("GOOGLE_API_KEY");
  const grok = has("XAI_API_KEY");

  return [
    { id: "github.repo.read", label: "GitHub repository read", connection: github ? "connected" : "not_connected", risk: "read", description: "Read repository tree and approved source files. Protected configuration paths are excluded.", execution: github ? "host" : "planned" },
    { id: "github.file.write", label: "GitHub controlled file write", connection: github ? "connected" : "not_connected", risk: "safe_write", description: "Create or update allow-listed files on a separate gateway working branch.", execution: github ? "host" : "planned" },
    { id: "github.file.delete", label: "GitHub file delete", connection: github ? "limited" : "not_connected", risk: "destructive", description: "Destructive repository changes are not delegated to autonomous models.", execution: github ? "host" : "planned" },
    { id: "vercel.git_deploy", label: "Vercel deployment through Git integration", connection: github ? "limited" : "not_connected", risk: "production", description: "Merged GitHub changes can trigger Vercel deployment; status must be verified before success is reported.", execution: github ? "git_integration" : "planned" },
    { id: "vercel.runtime.read", label: "Vercel deployment and runtime logs", connection: vercel ? "connected" : "not_connected", risk: "read", description: vercel ? "Read production deployment state, build events and runtime logs through the server-side Vercel connection." : "Direct Vercel management connection is not configured on the Royal Command server.", execution: vercel ? "host" : "planned" },
    { id: "vercel.deploy", label: "Vercel direct deployment", connection: vercel ? "connected" : github ? "limited" : "not_connected", risk: "production", description: vercel ? "Create a production deployment from the approved Royal Command GitHub source after explicit owner approval." : "Git-triggered deployment remains available; direct deployment is not configured.", execution: vercel ? "host" : github ? "git_integration" : "planned" },
    { id: "database.app", label: "Royal Command Supabase database", connection: supabase ? "connected" : "not_connected", risk: "safe_write", description: supabase ? "RLS-protected schema inspection, allow-listed reads, and narrow safe writes for decisions/service instances through the authenticated Royal Command server session." : "Supabase application connection is not configured.", execution: supabase ? "host" : "planned" },
    { id: "ai.openai", label: "OpenAI provider", connection: openai ? "connected" : "not_connected", risk: "read", description: "Server-side OpenAI model invocation.", execution: openai ? "host" : "planned" },
    { id: "ai.anthropic", label: "Anthropic provider", connection: anthropic ? "connected" : "not_connected", risk: "read", description: "Server-side Anthropic model invocation.", execution: anthropic ? "host" : "planned" },
    { id: "ai.google", label: "Google Gemini provider", connection: gemini ? "connected" : "not_connected", risk: "read", description: "Server-side Gemini model invocation.", execution: gemini ? "host" : "planned" },
    { id: "ai.xai", label: "xAI Grok provider", connection: grok ? "connected" : "not_connected", risk: "read", description: "Server-side xAI model invocation.", execution: grok ? "host" : "planned" },
    { id: "email.gmail", label: "Gmail", connection: "not_connected", risk: "safe_write", description: "Not yet exposed as a Royal Command server-side execution connector.", execution: "planned" },
    { id: "calendar.google", label: "Google Calendar", connection: "not_connected", risk: "safe_write", description: "Not yet exposed as a Royal Command server-side execution connector.", execution: "planned" },
    { id: "files.drive", label: "Google Drive / managed files", connection: "not_connected", risk: "safe_write", description: "Not yet exposed as a Royal Command server-side execution connector.", execution: "planned" },
    { id: "telephony.manage", label: "Retell / Twilio / Crazytel", connection: "not_connected", risk: "production", description: "Telephony administration requires a scoped connector and approval policy.", execution: "planned" },
    { id: "dns.manage", label: "Domain / DNS administration", connection: "not_connected", risk: "production", description: "Domain and DNS changes require a dedicated scoped connector and explicit approval.", execution: "planned" },
    { id: "billing.manage", label: "Billing / purchases", connection: "not_connected", risk: "billing", description: "Billing, purchases and plan changes are excluded from autonomous AI authority.", execution: "planned" },
    { id: "secret.read", label: "Protected values", connection: "not_connected", risk: "secret", description: "Protected values are never a model-readable capability; trusted host code may report connection status only.", execution: "planned" },
  ];
}

export function evaluateToolPermission(capabilityId: string, options?: { owner?: boolean; approved?: boolean }): GatewayDecision {
  const capability = getToolCapabilities().find((item) => item.id === capabilityId) || null;
  if (!capability) return { decision: "deny", capability: null, reason: "Unknown capability" };
  if (capability.connection === "not_connected") return { decision: "deny", capability, reason: "Capability is not connected to the Royal Command host" };
  if (capability.risk === "secret" || capability.risk === "billing" || capability.risk === "destructive") return { decision: "deny", capability, reason: `${capability.risk} authority is not delegated to autonomous AI execution` };
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
    "This manifest describes host-side capabilities available to Royal Command. It does not grant a model permission to bypass host policy.",
    "Models may analyse and propose work. Actual changes occur only through a host execution route after policy checks. Never claim an action was executed until the host returns verified evidence.",
    "There is no universal master credential. Service access stays server-side and is separated by service and risk.",
    "Connected/limited capabilities:",
    ...connected.map((item) => `- ${item.id}: ${item.connection}; risk=${item.risk}; execution=${item.execution}; ${item.description}`),
    "Currently not connected to Command Room host execution:",
    ...missing.map((item) => `- ${item.id}: ${item.description}`),
    "Permission rules: read-only may be automatic; safe writes require an authorised operator; production changes require explicit Harry approval; destructive/billing/protected-value authority is denied to autonomous models.",
  ].join("\n");
}

export function auditToolGateway(event: string, meta: Record<string, unknown>) {
  logger.info(`tool_gateway.${event}`, meta);
}
