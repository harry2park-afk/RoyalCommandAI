import { NextRequest } from "next/server";
import { z } from "zod";
import {
  executeDirect,
  executionErrorResponse,
  ExecutionError,
  requireServerSecret,
} from "@/lib/execution/directExecutionController";

const BodySchema = z.object({
  agentId: z.string().min(3),
  metadata: z.record(z.string(), z.unknown()).optional(),
  dynamicVariables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ExecutionError("Invalid Retell session request.", 400, "INVALID_REQUEST");
    }

    const result = await executeDirect("retell.create_web_call", async ({ actor, requestId }) => {
      const apiKey = requireServerSecret("RETELL_API_KEY");
      const response = await fetch("https://api.retellai.com/v2/create-web-call", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: parsed.data.agentId,
          metadata: {
            ...(parsed.data.metadata ?? {}),
            royal_command_user_id: actor.id,
            royal_command_request_id: requestId,
          },
          retell_llm_dynamic_variables: parsed.data.dynamicVariables,
        }),
        cache: "no-store",
      });

      const text = await response.text();
      let body: Record<string, unknown> = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { message: text };
      }

      if (!response.ok) {
        throw new ExecutionError(
          `Retell API ${response.status}: ${String(body.message ?? text).slice(0, 300)}`,
          response.status >= 500 ? 502 : response.status,
          "RETELL_API_ERROR",
        );
      }

      return {
        callId: body.call_id,
        accessToken: body.access_token,
        agentId: body.agent_id,
        agentVersion: body.agent_version,
        status: body.call_status,
      };
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return executionErrorResponse(error);
  }
}
