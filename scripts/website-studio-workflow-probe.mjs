// Zero-data infrastructure probe. Run only from the dedicated Preview build.
import { start } from 'workflow/api';
const target = process.argv[2];
if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'studio-work/workflow-probe-20260914-7438370' || !/^dpl_[A-Za-z0-9]+$/.test(target || '')) {
  console.log('STUDIO_WORKFLOW_PROBE skipped');
} else {
  let timer;
  try {
    const run = await start({ workflowId: 'workflow//./src/lib/website-studio/v2/durable//studioConnectionWorkflow' }, [], { deploymentId: target });
    console.log('STUDIO_WORKFLOW_PROBE ' + JSON.stringify({ phase: 'started', runId: run.runId, deploymentId: target }));
    const result = await Promise.race([run.returnValue, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 60000); })]);
    console.log('STUDIO_WORKFLOW_PROBE ' + JSON.stringify({ phase: 'finished', passed: result?.first === 1 && result?.second === 2 && result?.resumed === true, status: await run.status }));
  } catch { console.log('STUDIO_WORKFLOW_PROBE blocked_or_timed_out'); }
  finally { clearTimeout(timer); }
}
