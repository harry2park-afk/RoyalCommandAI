// Read-only RC backup inventory. Supply a Supabase fine-grained Management API
// token with backups_read only; never put a token in source or command history.
const PROJECT_REF = 'aygawkavujjmybekswrg';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/backups`;

export async function checkBackups(token, fetcher = fetch, now = Date.now()) {
  if (!token || typeof token !== 'string') throw new Error('SUPABASE_BACKUP_READ_TOKEN_MISSING');
  const response = await fetcher(ENDPOINT, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`SUPABASE_BACKUP_CHECK_FAILED_${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.backups)) throw new Error('SUPABASE_BACKUP_RESPONSE_INVALID');
  const completed = body.backups
    .filter(item => item.status === 'COMPLETED' && Number.isFinite(Date.parse(item.inserted_at)))
    .sort((a, b) => Date.parse(b.inserted_at) - Date.parse(a.inserted_at));
  const latest = completed[0]?.inserted_at ?? null;
  return {
    project: 'RoyalCommand',
    latestCompletedBackup: latest,
    completedBackupCount: completed.length,
    pitrEnabled: body.pitr_enabled === true,
    backupRecent: latest !== null && now - Date.parse(latest) >= 0 && now - Date.parse(latest) < 48 * 3600 * 1000,
    // Inventory presence does not prove a restore will succeed.
    restoreVerified: false,
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const status = await checkBackups(process.env.SUPABASE_BACKUP_READ_TOKEN);
    console.log(JSON.stringify(status, null, 2));
    if (!status.backupRecent) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'SUPABASE_BACKUP_CHECK_FAILED');
    process.exitCode = 1;
  }
}
