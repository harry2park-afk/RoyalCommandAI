import "server-only";

const RETELL_API_BASE = "https://api.retellai.com";

function getRetellApiKey(): string {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new Error("RETELL_API_KEY is not configured on the server.");
  }
  return apiKey;
}

async function retellRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${RETELL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getRetellApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Retell API ${response.status}: ${body.slice(0, 500)}`);
  }

  return response.json() as Promise<T>;
}

export type RetellVoiceAgentSummary = {
  agent_id: string;
  version: number;
  agent_name?: string;
  language?: string;
  voice_id?: string;
  is_published?: boolean;
  last_modification_timestamp?: number;
};

type RetellAgentListResponse = {
  items: RetellVoiceAgentSummary[];
  pagination_key?: string | null;
  has_more?: boolean;
};

export async function listRetellVoiceAgents(): Promise<RetellVoiceAgentSummary[]> {
  const agents: RetellVoiceAgentSummary[] = [];
  let paginationKey: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const body: Record<string, unknown> = {
      filter_criteria: {
        channel: { type: "string", op: "eq", value: "voice" },
      },
      limit: 100,
    };
    if (paginationKey) body.pagination_key = paginationKey;

    const result = await retellRequest<RetellAgentListResponse>("/v2/list-agents", {
      method: "POST",
      body: JSON.stringify(body),
    });

    agents.push(...(Array.isArray(result.items) ? result.items : []));

    if (!result.has_more || !result.pagination_key) break;
    paginationKey = result.pagination_key;
  }

  return agents;
}

export async function getRetellVoiceAgent(agentId: string): Promise<Record<string, unknown>> {
  if (!agentId || !agentId.startsWith("agent_")) {
    throw new Error("Invalid Retell agent id.");
  }
  return retellRequest<Record<string, unknown>>(`/get-agent/${encodeURIComponent(agentId)}`);
}

export async function getRetellLlm(llmId: string): Promise<Record<string, unknown>> {
  if (!llmId || !llmId.startsWith("llm_")) {
    throw new Error("Invalid Retell LLM id.");
  }
  return retellRequest<Record<string, unknown>>(`/get-retell-llm/${encodeURIComponent(llmId)}`);
}

// Mutating Retell operations are intentionally NOT exposed here yet.
// Royal Command requires Harry approval before create/update/delete/routing changes.
