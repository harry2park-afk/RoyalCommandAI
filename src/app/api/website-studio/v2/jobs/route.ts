import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { runtimeData } from "@/lib/website-studio/v2/runtime-data";
import { digest, StudioError } from "@/lib/website-studio/v2/schema";
import { checkpoint, readJob, submit } from "@/lib/website-studio/v2/store";
import { dispatchOutbox } from "@/lib/website-studio/v2/dispatch";

export const runtime = "nodejs";
const scopeInput = z.object({ tenantId: z.string().uuid(), projectId: z.string().uuid(), roomId: z.string().uuid() });
const submission = scopeInput.extend({ idempotencyKey: z.string().uuid(), order: z.string().min(1).max(12000) });
async function authorize(scope: z.infer<typeof scopeInput>) {
  const data = runtimeData(); // Disabled before touching RC auth or any database.
  const user = await getCurrentUser();
  if (!user) throw new StudioError("UNAUTHORIZED");
  const owned = { ...scope, actorId: user.id };
  const project = await data.project(owned);
  return { data, project, scope: owned };
}
function failure() { return Response.json({ error: "STUDIO_V2_NOT_READY_OR_UNAUTHORIZED" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new StudioError("ORIGIN_MISMATCH");
    const input = submission.parse(await request.json());
    const { data, project, scope } = await authorize(scopeInput.parse(input));
    const heartbeat = await checkpoint(data.store, db => db.dispatcherHeartbeatAt);
    if (!heartbeat || Date.now() - heartbeat > 120000) throw new StudioError("DURABLE_DISPATCHER_NOT_READY");
    const job = await submit(data.store, { scope, target: project.target, idempotencyKey: input.idempotencyKey,
      requestHash: digest(input.order), orderArtifactId: await data.put(scope, input.order) });
    await dispatchOutbox(data.store);
    return Response.json({ jobId: job.id }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch { return failure(); }
}
export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const { data, scope } = await authorize(scopeInput.parse(params));
    const job = await readJob(data.store, z.string().uuid().parse(params.jobId), scope);
    return Response.json({ jobId: job.id, stage: job.stage, status: job.status, passed: job.passed, outcome: job.outcome,
      commitSha: job.publication?.commitSha, previewUrl: job.preview?.url, errorCode: job.errorCode }, { headers: { "Cache-Control": "no-store" } });
  } catch { return failure(); }
}
