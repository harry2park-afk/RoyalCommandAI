import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ZERO_SHA = '0'.repeat(40);
function commit(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value) || value === ZERO_SHA) {
    throw new Error('Missing or invalid Quality Gate commit SHA.');
  }
  return value;
}

export function changedCodeFiles(eventName, event, cwd = process.cwd()) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  let output;
  if (eventName === 'pull_request') {
    const base = commit(event.pull_request?.base?.sha);
    const head = commit(event.pull_request?.head?.sha);
    // Compare the proposed branch with its actual PR base, not always master.
    output = git('diff', '--name-only', '-z', '--diff-filter=ACMR', `${base}...${head}`, '--');
  } else if (eventName === 'push') {
    const head = commit(event.after);
    git('cat-file', '-e', `${head}^{commit}`);
    if (event.before === ZERO_SHA) {
      // New/root branches have no prior push SHA. Check the entire tracked
      // source rather than silently omitting older changes on the branch.
      output = git('ls-tree', '-rz', '--name-only', head);
    } else {
      const base = commit(event.before);
      // Includes every commit in a batched push, including force-push changes.
      // A missing commit is an error, never an empty successful lint result.
      output = git('diff', '--name-only', '-z', '--diff-filter=ACMR', base, head, '--');
    }
  } else {
    throw new Error(`Unsupported Quality Gate event: ${eventName}`);
  }
  return output.split('\0').filter(file => /\.[cm]?[jt]sx?$/.test(file));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const files = changedCodeFiles(process.env.GITHUB_EVENT_NAME, event);
    if (files.length) {
      console.log(`Linting ${files.length} changed source files.`);
      execFileSync(process.execPath, ['node_modules/eslint/bin/eslint.js', '--', ...files], { stdio: 'inherit' });
    } else {
      console.log('No changed JS/TS files to lint.');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Quality Gate file selection failed.');
    process.exitCode = 1;
  }
}
