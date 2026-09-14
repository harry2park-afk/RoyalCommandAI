export type Capability = "astra" | "codex" | "isolatedRunner" | "sharedStore" | "publisher" | "testProject" | "automationBypass" | "rcTestLogin" | "cutover";
export type CapabilityEvidence = { connected: boolean; verifiedAt?: number; expiresAt?: number; targetId?: string };
export const required: Capability[] = ["astra", "codex", "isolatedRunner", "sharedStore", "publisher", "testProject", "automationBypass", "rcTestLogin", "cutover"];
/** Connected is informational. Ready requires fresh evidence for this project. */
export function readiness(evidence: Partial<Record<Capability, CapabilityEvidence>>, targetId: string, now: number) {
  const blocked = required.filter(key => {
    const item = evidence[key];
    return !item?.connected || item.verifiedAt === undefined || item.verifiedAt > now || !item.expiresAt || item.expiresAt <= now || item.targetId !== targetId;
  });
  return { ready: blocked.length === 0, blocked };
}
