import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkBackups } from './rcv3-check-backups.mjs';

test('reports completed recent backup without claiming restore verification', async () => {
  const result = await checkBackups('fixture', async (url, options) => {
    assert.equal(url, 'https://api.supabase.com/v1/projects/aygawkavujjmybekswrg/database/backups');
    assert.equal(options.method, 'GET');
    return { ok: true, json: async () => ({ backups: [
      { status: 'FAILED', inserted_at: '2026-09-25T12:00:00Z' },
      { status: 'COMPLETED', inserted_at: '2026-09-25T10:00:00Z' },
    ] }) };
  }, Date.parse('2026-09-25T12:00:00Z'));
  assert.equal(result.backupRecent, true);
  assert.equal(result.completedBackupCount, 1);
  assert.equal(result.restoreVerified, false);
});

test('fails closed when access or backup evidence is absent', async () => {
  await assert.rejects(checkBackups(''), /TOKEN_MISSING/);
  await assert.rejects(checkBackups('fixture', async () => ({ ok: false, status: 403 })), /FAILED_403/);
  const result = await checkBackups('fixture', async () => ({ ok: true, json: async () => ({ backups: [] }) }));
  assert.equal(result.backupRecent, false);
});
