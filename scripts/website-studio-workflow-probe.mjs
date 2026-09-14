// Zero-data infrastructure probe. Run only from the dedicated Preview build.
import { start, getRun } from 'workflow/api';
const target = process.argv[2];
if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'studio-work/workflow-probe-tracing-20260914-7438370' || !/^dpl_[A-Za-z0-9]+$/.test(target || '')) {
  console.log('STUDIO_WORKFLOW_PROBE skipped');
} else {
  try {
    // Retire this probe's earlier failed run; never touch application jobs.
    try { await getRun('wrun_01M2FS1S3YHPQ3HF80X41X555R').cancel(); console.log('STUDIO_WORKFLOW_PROBE prior_probe_retired'); }
    catch { console.log('STUDIO_WORKFLOW_PROBE prior_probe_retirement_unconfirmed'); }
    const run = await start({ workflowId: 'workflow//./src/lib/website-studio/v2/durable//studioConnectionWorkflow' }, [], { deploymentId: target });
    console.log('STUDIO_WORKFLOW_PROBE ' + JSON.stringify({ phase: 'started', runId: run.runId, deploymentId: target }));
    let status;
    for (let attempt = 0; attempt < 60; attempt++) {
      status = await run.status;
      if (['completed', 'failed', 'cancelled'].includes(status)) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (status !== 'completed') { await run.cancel(); throw new Error('not_completed'); }
    const result = await run.returnValue;
    console.log('STUDIO_WORKFLOW_PROBE ' + JSON.stringify({ phase: 'finished', passed: result?.first === 1 && result?.second === 2 && result?.resumed === true, status: await run.status }));
  } catch { console.log('STUDIO_WORKFLOW_PROBE blocked_or_timed_out'); }
}
