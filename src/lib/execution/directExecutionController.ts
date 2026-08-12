import "server-only";

import { getCurrentUser } from "@/lib/auth";

export type ExecutionActor = {
  id: string;
  email: string;
  fullName: string;
};

export type ExecutionContext = {
  actor: ExecutionActor;
  requestId: string;
};

export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "EXECUTION_ERROR",
  ) {
    super(message);
  }
}

export async function requireExecutionContext(): Promise<ExecutionContext> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ExecutionError("Authentication required.", 401, "AUTH_REQUIRED");
  }

  return {
    actor: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    requestId: crypto.randomUUID(),
  };
}

export function requireServerSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ExecutionError(`${name} is not configured on the server.`, 503, "INTEGRATION_NOT_CONFIGURED");
  }
  return value;
}

export async function executeDirect<T>(
  operation: string,
  fn: (context: ExecutionContext) => Promise<T>,
): Promise<{ ok: true; operation: string; requestId: string; data: T }> {
  const context = await requireExecutionContext();

  try {
    const data = await fn(context);
    return { ok: true, operation, requestId: context.requestId, data };
  } catch (error) {
    if (error instanceof ExecutionError) throw error;
    const message = error instanceof Error ? error.message : "Unknown execution failure.";
    throw new ExecutionError(message, 502, "UPSTREAM_EXECUTION_FAILED");
  }
}

export function executionErrorResponse(error: unknown): Response {
  const normalized =
    error instanceof ExecutionError
      ? error
      : new ExecutionError(
          error instanceof Error ? error.message : "Unexpected server error.",
          500,
          "INTERNAL_ERROR",
        );

  return Response.json(
    { ok: false, error: normalized.message, code: normalized.code },
    { status: normalized.status },
  );
}
