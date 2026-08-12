import { NextRequest } from "next/server";
import { z } from "zod";
import {
  executeDirect,
  executionErrorResponse,
  ExecutionError,
  requireServerSecret,
} from "@/lib/execution/directExecutionController";

const BodySchema = z.object({
  to: z.string().min(6),
  from: z.string().min(6).optional(),
  twiml: z.string().min(1).optional(),
  url: z.string().url().optional(),
  statusCallback: z.string().url().optional(),
}).refine((value) => !(value.twiml && value.url), {
  message: "Use either twiml or url, not both.",
});

function formEncode(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ExecutionError("Invalid Twilio call request.", 400, "INVALID_REQUEST");
    }

    const result = await executeDirect("twilio.create_call", async () => {
      const accountSid = requireServerSecret("TWILIO_ACCOUNT_SID");
      const authToken = requireServerSecret("TWILIO_AUTH_TOKEN");
      const defaultFrom = process.env.TWILIO_FROM_NUMBER?.trim();
      const from = parsed.data.from ?? defaultFrom;
      if (!from) {
        throw new ExecutionError("TWILIO_FROM_NUMBER is not configured.", 503, "INTEGRATION_NOT_CONFIGURED");
      }

      const twiml = parsed.data.twiml ??
        (!parsed.data.url ? "<Response><Say>Royal Command test call connected.</Say></Response>" : undefined);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Calls.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formEncode({
            To: parsed.data.to,
            From: from,
            Twiml: twiml,
            Url: parsed.data.url,
            StatusCallback: parsed.data.statusCallback,
            StatusCallbackMethod: parsed.data.statusCallback ? "POST" : undefined,
          }),
          cache: "no-store",
        },
      );

      const text = await response.text();
      let body: Record<string, unknown> = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { message: text };
      }

      if (!response.ok) {
        throw new ExecutionError(
          `Twilio API ${response.status}: ${String(body.message ?? text).slice(0, 300)}`,
          response.status >= 500 ? 502 : response.status,
          "TWILIO_API_ERROR",
        );
      }

      return {
        sid: body.sid,
        status: body.status,
        direction: body.direction,
        to: body.to,
        from: body.from,
        queueTime: body.queue_time,
      };
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return executionErrorResponse(error);
  }
}
