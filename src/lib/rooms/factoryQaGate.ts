export type FactoryQaWorkflowRun = {
  name: string;
  status: string;
  conclusion?: string | null;
  htmlUrl?: string;
};

export type FactoryQaCommitStatus = {
  context: string;
  state: string;
  targetUrl?: string;
};

const REQUIRED_WORKFLOWS = [
  "Royal Command Quality Gate",
  "Royal Command Conflict Guard",
  "Royal Command Change Control",
] as const;

export function evaluateFactoryQaEvidence(
  workflowRuns: FactoryQaWorkflowRun[],
  commitStatuses: FactoryQaCommitStatus[],
) {
  const workflowEvidence = REQUIRED_WORKFLOWS.map((name) => {
    const matching = workflowRuns.filter((run) => run.name === name);
    const latest = matching[0] || null;
    return {
      name,
      status: latest?.status || "missing",
      conclusion: latest?.conclusion || null,
      htmlUrl: latest?.htmlUrl || null,
      passed: latest?.status === "completed" && latest?.conclusion === "success",
    };
  });

  const vercel = commitStatuses.find((status) => status.context.toLowerCase() === "vercel") || null;
  const vercelPassed = Boolean(vercel && vercel.state === "success");
  const blockers = [
    ...workflowEvidence.filter((item) => !item.passed).map((item) => `${item.name}: ${item.status}/${item.conclusion || "none"}`),
    ...(!vercelPassed ? [`Vercel: ${vercel?.state || "missing"}`] : []),
  ];

  return {
    ready: blockers.length === 0,
    workflowEvidence,
    vercel: vercel ? { context: vercel.context, state: vercel.state, targetUrl: vercel.targetUrl || null } : null,
    blockers,
  };
}
