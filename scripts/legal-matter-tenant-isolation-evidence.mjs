import { createClient } from '@supabase/supabase-js';

const url = process.env.RC_LEGAL_SUPABASE_URL;
const anonKey = process.env.RC_LEGAL_ANON_KEY;
const serviceRoleKey = process.env.RC_LEGAL_SERVICE_ROLE_KEY;
const allowLocalhost = process.env.RC_LEGAL_ALLOW_LOCALHOST === '1';

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error('Missing RC_LEGAL_SUPABASE_URL / RC_LEGAL_ANON_KEY / RC_LEGAL_SERVICE_ROLE_KEY');
}

const parsed = new URL(url);
const isLocal = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
if (!isLocal || !allowLocalhost) {
  throw new Error('Legal Matter security evidence is restricted to an explicitly enabled localhost Supabase stack');
}

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const service = createClient(url, serviceRoleKey, options);
const makeAnon = () => createClient(url, anonKey, options);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label, role, runId) {
  const email = `rc-legal-${label}-${runId}@example.test`;
  const password = `RC-Legal-${runId}-${label}-Aa1!`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `RC Legal ${label}` },
  });
  if (error || !data.user) throw error ?? new Error(`Failed to create ${label}`);

  const { error: roleError } = await service
    .from('profiles')
    .update({ role })
    .eq('id', data.user.id);
  if (roleError) throw roleError;

  const client = makeAnon();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: data.user.id, email, password, role, client };
}

async function expectRpcFailure(client, args, label) {
  const { error } = await client.rpc('set_matter_staff_assignment', args);
  assert(error, `${label}: expected RPC failure`);
}

async function expectInsertFailure(client, table, row, label) {
  const { error } = await client.from(table).insert(row);
  assert(error, `${label}: expected insert failure`);
}

async function cleanup(users, marker) {
  await service.from('matters').delete().like('title', `${marker}%`);
  for (const user of users.reverse()) {
    try {
      await service.auth.admin.deleteUser(user.id);
    } catch {
      // Best effort; the stack is disposable and is stopped without backup.
    }
  }
}

const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const marker = `RC_ISOLATION_${runId}_`;
const createdUsers = [];

try {
  const admin = await createUser('admin', 'admin', runId); createdUsers.push(admin);
  const staffA = await createUser('staff-a', 'staff', runId); createdUsers.push(staffA);
  const staffB = await createUser('staff-b', 'staff', runId); createdUsers.push(staffB);
  const clientA = await createUser('client-a', 'client', runId); createdUsers.push(clientA);
  const clientB = await createUser('client-b', 'client', runId); createdUsers.push(clientB);

  const { data: seeded, error: seedError } = await service
    .from('matters')
    .insert([
      { client_id: clientA.id, service_line: 'legal', title: `${marker}A`, summary: 'tenant A' },
      { client_id: clientB.id, service_line: 'legal', title: `${marker}B`, summary: 'tenant B' },
    ])
    .select('id,client_id,assigned_staff_id,title');
  if (seedError) throw seedError;
  assert(seeded?.length === 2, 'Expected two seeded matters');
  const matterA = seeded.find((row) => row.client_id === clientA.id);
  const matterB = seeded.find((row) => row.client_id === clientB.id);
  assert(matterA && matterB, 'Failed to resolve seeded matters');

  const { data: clientARows, error: clientASelectError } = await clientA.client
    .from('matters').select('id,client_id').like('title', `${marker}%`);
  if (clientASelectError) throw clientASelectError;
  assert(clientARows.length === 1 && clientARows[0].id === matterA.id, 'client A must see only own matter');

  const { data: clientBRows, error: clientBSelectError } = await clientB.client
    .from('matters').select('id,client_id').like('title', `${marker}%`);
  if (clientBSelectError) throw clientBSelectError;
  assert(clientBRows.length === 1 && clientBRows[0].id === matterB.id, 'client B must see only own matter');

  const { data: staffBefore, error: staffBeforeError } = await staffA.client
    .from('matters').select('id').like('title', `${marker}%`);
  if (staffBeforeError) throw staffBeforeError;
  assert(staffBefore.length === 0, 'unassigned staff must see zero tenant matters');

  const { data: clientCreated, error: clientCreateError } = await clientA.client
    .from('matters')
    .insert({ client_id: clientA.id, service_line: 'legal', title: `${marker}CLIENT_CREATE`, summary: 'self intake' })
    .select('id,assigned_staff_id')
    .single();
  if (clientCreateError) throw clientCreateError;
  assert(clientCreated.assigned_staff_id === null, 'client-created matter must start unassigned');

  await expectInsertFailure(
    clientA.client,
    'matters',
    { client_id: clientA.id, assigned_staff_id: staffA.id, service_line: 'legal', title: `${marker}BAD_ASSIGN` },
    'client self-assignment',
  );
  await expectInsertFailure(
    staffA.client,
    'matters',
    { client_id: clientA.id, service_line: 'legal', title: `${marker}BAD_STAFF_CREATE` },
    'ordinary staff arbitrary client creation',
  );

  const { data: assignResult, error: assignError } = await admin.client.rpc('set_matter_staff_assignment', {
    p_matter_id: matterA.id,
    p_staff_id: staffA.id,
  });
  if (assignError) throw assignError;
  assert(assignResult === matterA.id, 'admin assignment RPC must return matter id');

  await expectRpcFailure(staffA.client, { p_matter_id: matterB.id, p_staff_id: staffA.id }, 'staff assignment');
  await expectRpcFailure(clientA.client, { p_matter_id: matterA.id, p_staff_id: null }, 'client unassignment');
  await expectRpcFailure(admin.client, { p_matter_id: matterA.id, p_staff_id: clientB.id }, 'non-staff assignee');

  const { data: staffAssignedRows, error: staffAssignedError } = await staffA.client
    .from('matters').select('id,client_id,assigned_staff_id').like('title', `${marker}%`);
  if (staffAssignedError) throw staffAssignedError;
  assert(staffAssignedRows.length === 1 && staffAssignedRows[0].id === matterA.id, 'staff A must see only assigned matter A');

  const { data: staffBRows, error: staffBError } = await staffB.client
    .from('matters').select('id').like('title', `${marker}%`);
  if (staffBError) throw staffBError;
  assert(staffBRows.length === 0, 'unassigned staff B must see no tenant matter');

  const { error: clientTransferError } = await clientA.client
    .from('matters').update({ client_id: clientB.id }).eq('id', matterA.id);
  assert(clientTransferError, 'client direct client_id transfer must be denied at column privilege boundary');

  const { error: clientAssignError } = await clientA.client
    .from('matters').update({ assigned_staff_id: staffB.id }).eq('id', matterA.id);
  assert(clientAssignError, 'client direct assigned_staff_id update must be denied');

  const { error: staffTransferError } = await staffA.client
    .from('matters').update({ client_id: clientB.id }).eq('id', matterA.id);
  assert(staffTransferError, 'staff direct client_id transfer must be denied');

  const { data: mutableUpdate, error: mutableUpdateError } = await staffA.client
    .from('matters').update({ title: `${marker}A_UPDATED` }).eq('id', matterA.id).select('id,title');
  if (mutableUpdateError) throw mutableUpdateError;
  assert(mutableUpdate.length === 1 && mutableUpdate[0].id === matterA.id, 'assigned staff must update allowed mutable field');

  const { data: crossUpdate, error: crossUpdateError } = await staffA.client
    .from('matters').update({ title: `${marker}B_ATTACK` }).eq('id', matterB.id).select('id');
  if (crossUpdateError) throw crossUpdateError;
  assert(crossUpdate.length === 0, 'assigned staff must not update unrelated matter');

  const { error: ownMessageError } = await staffA.client.from('matter_messages').insert({
    matter_id: matterA.id, author_id: staffA.id, body: 'allowed assigned-staff message',
  });
  if (ownMessageError) throw ownMessageError;
  await expectInsertFailure(staffA.client, 'matter_messages', {
    matter_id: matterB.id, author_id: staffA.id, body: 'blocked cross-tenant message',
  }, 'staff cross-tenant message');

  const { error: ownDocError } = await clientA.client.from('matter_documents').insert({
    matter_id: matterA.id, uploaded_by: clientA.id, filename: 'allowed.txt', category: 'other',
  });
  if (ownDocError) throw ownDocError;
  await expectInsertFailure(clientA.client, 'matter_documents', {
    matter_id: matterB.id, uploaded_by: clientA.id, filename: 'blocked.txt', category: 'other',
  }, 'client cross-tenant document');

  const { error: ownReadError } = await clientA.client.from('matter_chat_reads').insert({
    user_id: clientA.id, matter_id: matterA.id,
  });
  if (ownReadError) throw ownReadError;
  await expectInsertFailure(clientA.client, 'matter_chat_reads', {
    user_id: clientA.id, matter_id: matterB.id,
  }, 'client cross-tenant chat read');

  const { data: adminRows, error: adminSelectError } = await admin.client
    .from('matters').select('id').like('title', `${marker}%`);
  if (adminSelectError) throw adminSelectError;
  assert(adminRows.length >= 3, 'admin must retain global triage visibility for test matters');

  const { error: unassignError } = await admin.client.rpc('set_matter_staff_assignment', {
    p_matter_id: matterA.id,
    p_staff_id: null,
  });
  if (unassignError) throw unassignError;

  const { data: staffAfterUnassign, error: staffAfterError } = await staffA.client
    .from('matters').select('id').eq('id', matterA.id);
  if (staffAfterError) throw staffAfterError;
  assert(staffAfterUnassign.length === 0, 'staff must lose access immediately after admin unassignment');

  const { data: finalA, error: finalError } = await service
    .from('matters').select('id,client_id,assigned_staff_id').eq('id', matterA.id).single();
  if (finalError) throw finalError;
  assert(finalA.client_id === clientA.id, 'client_id must remain unchanged throughout assignment workflow');
  assert(finalA.assigned_staff_id === null, 'final admin unassignment must persist');

  console.log(JSON.stringify({
    status: 'PASS',
    evidence: {
      admin_assignment_and_unassignment: true,
      non_admin_assignment_denied: true,
      non_staff_assignee_denied: true,
      client_tenant_isolation: true,
      assigned_staff_only_access: true,
      protected_client_and_assignment_fields_immutable: true,
      child_table_parent_boundary: true,
      post_unassignment_access_removed: true,
    },
  }, null, 2));
} finally {
  await cleanup(createdUsers, marker);
}
