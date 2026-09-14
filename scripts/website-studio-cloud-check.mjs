// Dedicated Preview build only; never touch application jobs or customer data.
import { start, getRun } from 'workflow/api';
const expectedBranch = 'studio-work/workflow-probe-tracing-20260914-7438370';
const workflowId = 'workflow//./src/lib/website-studio/v2/durable//studioConnectionWorkflow';
const target = 'dpl_7Tnog5tTVnocnU31A9nhJHZaaRnc';
const priorId = 'wrun_01M2FS1S3YHPQ3HF80X41X555R';
const terminal = new Set(['completed', 'failed', 'cancelled']);
const report = value => console.log('STUDIO_CLOUD_CHECK ' + JSON.stringify(value));
if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== expectedBranch) {
  report({ phase: 'skipped' });
} else {
  // A real process deadline also stops SDK polling/network handles.
  const watchdog = setTimeout(() => { report({ phase: 'process_deadline' }); process.exit(1); }, 95000);
  let run;
  try {
    const prior = getRun(priorId);
    if (await prior.workflowName !== workflowId) throw new Error('identity');
    const priorStatus = await prior.status;
    report({ phase: 'prior_status', runId: priorId, status: priorStatus });
    if (!terminal.has(priorStatus)) {
      if (!['pending', 'running'].includes(priorStatus)) throw new Error('unknown_status');
      await prior.cancel();
      if (!terminal.has(await prior.status)) throw new Error('cancel_unconfirmed');
      report({ phase: 'prior_retired', runId: priorId, status: await prior.status });
    }
    run = await start({ workflowId }, [], { deploymentId: target });
    report({ phase: 'started', runId: run.runId, deploymentId: target });
    let status;
    for (let attempt = 0; attempt < 45; attempt++) {
      status = await run.status;
      if (terminal.has(status)) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (status !== 'completed') throw new Error('not_completed');
    const value = await run.returnValue;
    report({ phase: 'verified', runId: run.runId, status, passed: value?.first === 1 && value?.second === 2 && value?.resumed === true });
  } catch {
    report({ phase: 'blocked' });
    if (run) {
      try { if (!terminal.has(await run.status)) await run.cancel(); report({ phase: 'cleanup', runId: run.runId, status: await run.status }); }
      catch { report({ phase: 'cleanup_unconfirmed', runId: run.runId }); }
    }
  } finally { clearTimeout(watchdog); }
  // Do not keep the Preview build alive for abandoned internal SDK handles.
  process.exit(0);
}
