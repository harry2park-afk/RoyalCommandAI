import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { changedCodeFiles } from './quality-gate-lint.mjs';

function repository(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'rc-ci-fixture-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'base');
  git('config', 'user.name', 'RC CI fixture');
  git('config', 'user.email', 'fixture@example.test');
  const save = (name, content = 'export const fixture = true;\n') => {
    writeFileSync(join(cwd, name), content);
    git('add', '--', name); git('commit', '-m', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  return { cwd, git, save };
}

test('PR comparison uses its actual base and all proposed commits', t => {
  const { cwd, git, save } = repository(t);
  save('initial.ts'); git('switch', '-c', 'work');
  save('first.ts'); const head = save('second.tsx');
  git('switch', 'base'); const base = save('base-only.ts');
  assert.deepEqual(changedCodeFiles('pull_request', { pull_request: { base: { sha: base }, head: { sha: head } } }, cwd), ['first.ts', 'second.tsx']);
});

test('push includes every commit and handles rename, deletion and unusual filenames', t => {
  const { cwd, git, save } = repository(t);
  const before = save('old.ts'); save('with space.ts'); save('with\nnewline.mjs');
  git('mv', 'old.ts', 'renamed.ts'); git('commit', '-m', 'rename');
  const after = git('rev-parse', 'HEAD');
  assert.deepEqual(changedCodeFiles('push', { before, after }, cwd).sort(), ['renamed.ts', 'with space.ts', 'with\nnewline.mjs'].sort());
  git('rm', 'renamed.ts'); git('commit', '-m', 'delete');
  assert.deepEqual(changedCodeFiles('push', { before: after, after: git('rev-parse', 'HEAD') }, cwd), []);
});

test('new branches and root commits conservatively select all tracked code', t => {
  const { cwd, save } = repository(t);
  const root = save('first.ts');
  assert.deepEqual(changedCodeFiles('push', { before: '0'.repeat(40), after: root }, cwd), ['first.ts']);
  save('second.cjs'); const after = save('notes.md', 'Notes');
  assert.deepEqual(changedCodeFiles('push', { before: '0'.repeat(40), after }, cwd), ['first.ts', 'second.cjs']);
});

test('malformed events and missing force-push commits fail closed', t => {
  const { cwd, save } = repository(t);
  const after = save('first.ts');
  assert.throws(() => changedCodeFiles('push', { after }, cwd));
  assert.throws(() => changedCodeFiles('push', { before: '--help', after }, cwd));
  assert.throws(() => changedCodeFiles('push', { before: 'a'.repeat(40), after }, cwd));
  assert.throws(() => changedCodeFiles('pull_request', {}, cwd));
  assert.throws(() => changedCodeFiles('workflow_dispatch', {}, cwd));
});
