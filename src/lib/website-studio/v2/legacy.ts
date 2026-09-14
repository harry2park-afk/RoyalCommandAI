import { z } from "zod";
import { digest, openDesign } from "../contract";
import { StudioError } from "./schema";

const legacy = z.object({ summary: z.string().min(1), paths: z.array(z.string()).min(1), checks: z.array(z.string()).min(1) });
const current = z.discriminatedUnion("outcome", [
  legacy.extend({ outcome: z.literal("accepted") }),
  z.object({ outcome: z.literal("unsupported"), summary: z.string().min(1), reason: z.string().min(1) }),
]);
/** Read only: verify the original serialized payload BEFORE normalizing it.
 * This adapter never rewrites the v1 ledger or reclassifies historical failures.
 */
export function readLegacyDesign(raw: string, expectedHash: string) {
  if (digest(raw) !== expectedHash) throw new StudioError("LEGACY_DIGEST_MISMATCH");
  const parsed = JSON.parse(raw);
  if (parsed?.outcome !== undefined) return current.parse(parsed);
  return { ...legacy.parse(parsed), outcome: "accepted" as const };
}
export function decryptLegacyDesign(input: { artifact: string; workId: string; requestKey?: string; designHash: string }) {
  if (!input.requestKey) throw new StudioError("LEGACY_KEY_REQUIRED");
  try { return readLegacyDesign(openDesign(input.artifact, input.requestKey, input.workId), input.designHash); }
  catch { throw new StudioError("LEGACY_DESIGN_UNREADABLE"); }
}
