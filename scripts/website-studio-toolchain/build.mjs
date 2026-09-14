import { lstat, readFile, mkdir, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
// Trusted build contract. Never run a generated package script or install dependencies.
for (const name of ['index.html', 'app.mjs', 'core.mjs']) {
  const path = resolve('public', name);
  if (!(await lstat(path)).isFile()) throw new Error('SOURCE_FILE_REQUIRED');
  if ((await readFile(path)).length > 300000) throw new Error('SOURCE_TOO_LARGE');
  if (name.endsWith('.mjs')) {
    const result = spawnSync(process.execPath, ['--check', path], { stdio: 'ignore', timeout: 5000 });
    if (result.status !== 0) throw new Error('SOURCE_SYNTAX_INVALID');
  }
  await mkdir('dist', { recursive: true });
  await copyFile(path, resolve('dist', name));
}
