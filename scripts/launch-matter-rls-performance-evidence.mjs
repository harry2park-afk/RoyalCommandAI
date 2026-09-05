import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const baselinePath = 'supabase/migrations/20260831225500_scope_matter_staff_access.sql';
const candidatePath = 'supabase/migrations/20260903155500_optimize_launch_matter_rls.sql';

const baseline = readFileSync(baselinePath, 'utf8');
const candidate = readFileSync(candidatePath, 'utf8');
const candidateCode = candidate.replace(/--.*$/gm, '');

function gitBlobSha(content) {
  const body = Buffer.from(content, 'utf8');
  return createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

function requireMatch(value, pattern, label) {
  if (!pattern.test(value)) {
    throw new Error(`Missing required safeguard: ${label}`);
  }
}

const expectedBaselineBlob = '194403f96d9d55bcde5979718e0384e9b99cffb9';
const actualBaselineBlob = gitBlobSha(baseline);
if (actualBaselineBlob !== expectedBaselineBlob) {
  throw new Error(
    `Legal Matter isolation baseline moved: expected ${expectedBaselineBlob}, got ${actualBaselineBlob}`,
  );
}

// The performance follow-up must remain policy/index-only. Privileged functions,
// grants, schema changes and data writes belong to separately reviewed migrations.
for (const forbidden of [
  /create\s+or\s+replace\s+function/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /alter\s+table/i,
  /drop\s+table/i,
  /insert\s+into/i,
  /delete\s+from/i,
  /update\s+public\./i,
]) {
  if (forbidden.test(candidateCode)) {
    throw new Error(`Candidate exceeds policy/index-only scope: ${forbidden}`);
  }
}

if (/private\.is_staff_or_admin\s*\(/i.test(candidateCode)) {
  throw new Error('Candidate must not restore broad staff/admin Matter access');
}

// Every caller-identity read in executable SQL must use the advisor-recommended
// SELECT wrapper. Strip accepted forms and reject any remaining auth.uid().
const withoutWrappedUid = candidateCode.replace(
  /\(\s*select\s+auth\.uid\(\)\s*\)/gi,
  'WRAPPED_AUTH_UID',
);
if (/auth\.uid\(\)/i.test(withoutWrappedUid)) {
  throw new Error('Found unwrapped auth.uid() in launch Matter RLS candidate');
}

const requiredPolicyPredicates = [
  ['Matter client ownership', /client_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/i],
  ['admin access helper', /private\.is_admin\s*\(\s*\)/i],
  ['assigned-staff helper', /private\.is_assigned_matter_staff\s*\(/i],
  ['document uploader ownership', /uploaded_by\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/i],
  ['message author ownership', /author_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/i],
  ['chat-read user ownership', /user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/i],
  ['client self-intake remains unassigned', /assigned_staff_id\s+is\s+null/i],
  ['parent Matter client boundary', /private\.is_matter_client\s*\(/i],
];
for (const [label, pattern] of requiredPolicyPredicates) {
  requireMatch(candidateCode, pattern, label);
}

for (const policy of [
  'matters_select_own_or_staff',
  'matters_insert_own',
  'matters_update_own_or_staff',
  'matter_documents_insert',
  'matter_messages_insert',
  'matter_chat_reads_select',
  'matter_chat_reads_insert',
  'matter_chat_reads_update',
]) {
  requireMatch(candidateCode, new RegExp(`create\\s+policy\\s+${policy}\\b`, 'i'), `policy ${policy}`);
}

for (const indexName of [
  'matter_chat_reads_matter_id_idx',
  'matter_documents_uploaded_by_idx',
  'matter_messages_author_id_idx',
]) {
  requireMatch(
    candidateCode,
    new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${indexName}\\b`, 'i'),
    `covering index ${indexName}`,
  );
}

console.log('Launch Matter RLS performance evidence passed.');
console.log(`Pinned isolation baseline blob: ${actualBaselineBlob}`);
console.log('Verified policy/index-only scope, no broad staff path, wrapped auth.uid(), and three targeted FK indexes.');
