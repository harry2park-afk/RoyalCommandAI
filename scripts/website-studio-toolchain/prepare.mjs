import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const [destination, baseImage] = process.argv.slice(2);
if (!destination || !/^[a-zA-Z0-9_./-]+@sha256:[a-f0-9]{64}$/.test(baseImage || '')) throw new Error('NEW_DESTINATION_AND_PINNED_BASE_IMAGE_REQUIRED');
const root = resolve(destination), here = dirname(fileURLToPath(import.meta.url));
// mkdir without recursive rejects an existing destination; never overwrite a workspace.
await mkdir(root);
const template = resolve(root, 'template'), runner = resolve(root, 'runner');
await mkdir(template); await mkdir(runner); await mkdir(resolve(template, 'public')); await mkdir(resolve(template, 'tools'));
for (const name of ['index.html', 'app.mjs', 'core.mjs']) await copyFile(resolve(here, '../../examples/website-studio-test', name), resolve(template, 'public', name));
for (const name of ['build.mjs', 'test.mjs']) await copyFile(resolve(here, name), resolve(runner, name));
await copyFile(resolve(here, 'build.mjs'), resolve(template, 'tools/build.mjs'));
await writeFile(resolve(template, '.gitignore'), '/dist/\n');
await writeFile(resolve(template, 'package.json'), JSON.stringify({ name: 'studio-isolated-calculator', private: true, type: 'module', scripts: { build: 'node tools/build.mjs' } }, null, 2) + '\n');
await writeFile(resolve(template, 'package-lock.json'), JSON.stringify({ name: 'studio-isolated-calculator', lockfileVersion: 3, requires: true, packages: { '': { name: 'studio-isolated-calculator' } } }, null, 2) + '\n');
await writeFile(resolve(template, 'vercel.json'), JSON.stringify({ framework: null, buildCommand: 'node tools/build.mjs', outputDirectory: 'dist' }, null, 2) + '\n');
const git = args => execFileSync('git', args, { cwd: template, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
git(['init', '-b', 'studio-work/calculator']); git(['add', '.']);
const treeSha = git(['write-tree']);
git(['-c', 'user.name=Studio Test Template', '-c', 'user.email=studio-test@example.invalid', 'commit', '-m', 'Trusted isolated calculator template']);
// Base image must already contain node and git. No network install, env, credentials or remote origin.
await writeFile(resolve(root, 'Dockerfile'), `FROM ${baseImage}\nWORKDIR /vercel/sandbox\nCOPY template/ ./\nCOPY runner/ /opt/studio/\nRUN node --version && test "$(git rev-parse 'HEAD^{tree}')" = "${treeSha}" && test -z "$(git status --porcelain --untracked-files=all)"\n`);
await writeFile(resolve(root, '.dockerignore'), 'template/dist\n');
await writeFile(resolve(root, 'manifest-public.json'), JSON.stringify({ templateTreeSha: treeSha, allowedPaths: ['public/index.html', 'public/app.mjs', 'public/core.mjs'], image: null, isolationVerified: false }, null, 2) + '\n');
console.log(JSON.stringify({ templateTreeSha: treeSha, imageBuilt: false, isolationVerified: false }));
