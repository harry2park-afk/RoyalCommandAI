"use client";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with ${response.status}`);
  }
  return data as T;
}

export type RetellSessionResult = {
  ok: true;
  requestId: string;
  data: {
    callId: string;
    accessToken: string;
    agentId: string;
    agentVersion?: number;
    status?: string;
  };
};

export type TwilioCallResult = {
  ok: true;
  requestId: string;
  data: {
    sid: string;
    status?: string;
    direction?: string;
    to?: string;
    from?: string;
    queueTime?: string;
  };
};

export async function createRetellWebSession(
  agentId: string,
  options?: {
    metadata?: Record<string, unknown>;
    dynamicVariables?: Record<string, string | number | boolean>;
  },
) {
  return postJson<RetellSessionResult>("/api/v1/retell/session", {
    agentId,
    metadata: options?.metadata,
    dynamicVariables: options?.dynamicVariables,
  });
}

export async function placeTwilioCall(input: {
  to: string;
  from?: string;
  twiml?: string;
  url?: string;
  statusCallback?: string;
}) {
  return postJson<TwilioCallResult>("/api/v1/twilio/call", input);
}
