import fs from 'node:fs';

const path = 'src/app/api/builder/route.ts';
let source = fs.readFileSync(path, 'utf8');

source = source.replace(
  '  const baseRef = await github(`/git/ref/heads/${encodeURIComponent(BASE_BRANCH)}`);\n  try {',
  '  const baseRef = await github(`/git/ref/heads/${encodeURIComponent(BASE_BRANCH)}`);\n  const baseSha = baseRef.object?.sha;\n  if (!baseSha) throw new Error("Base branch SHA is missing");\n  try {'
);
source = source.replace(
  '      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha }),',
  '      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),' 
);
source = source.replace(
  '      .map((entry: { path: string }) => entry.path)',
  '      .map((entry) => entry.path)\n      .filter((path): path is string => typeof path === "string")'
);

fs.writeFileSync(path, source);
console.log('Builder typecheck fixes applied.');
