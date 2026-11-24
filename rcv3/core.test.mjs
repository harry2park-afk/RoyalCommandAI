import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDesign, validateDesign, editDesign, copyDesignToDraft } from './core.mjs';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const source = () => ({ ownerId: owner, revision: 0, design: defaultDesign() });

test('blank background and transparent buttons retain fixed capabilities', () => {
  const room = source();
  const candidate = structuredClone(room.design);
  Object.assign(candidate.buttons[0], { x: 60, y: 40, label: '내 AI', opacity: 0 });
  const result = editDesign(room, owner, 0, candidate);
  assert.equal(result.design.buttons[0].capability, 'chat');
  assert.equal(result.design.backgroundAssetId, null);
  assert.equal(room.design.buttons[0].x, 5);
  assert.throws(() => { result.design.buttons[0].capability = 'files'; }, TypeError);
});

test('customer configuration cannot inject code, endpoints or authority', () => {
  for (const key of ['script', 'endpoint', 'apiKey', 'ownerId', 'permissions']) {
    assert.throws(() => validateDesign({ ...defaultDesign(), [key]: 'injected' }), /INVALID_DESIGN/);
  }
  assert.throws(() => validateDesign({ ...defaultDesign(), backgroundAssetId: 'javascript:alert(1)' }), /INVALID_DESIGN/);
});

test('function reassignment and stale edits are refused', () => {
  const room = source();
  const candidate = structuredClone(room.design);
  candidate.buttons[0].capability = 'secretary';
  assert.throws(() => editDesign(room, owner, 0, candidate), /CAPABILITY_LOCKED/);
  assert.throws(() => editDesign(room, owner, 4, room.design), /EDIT_CONFLICT/);
});

test('copy is new empty draft; private content is never copied', () => {
  const room = { ...source(), id: 'old-room', status: 'ready', apiKey: 'test-sentinel', history: ['private'], jobs: ['send'] };
  const first = copyDesignToDraft(room, owner);
  const second = copyDesignToDraft(room, owner);
  assert.notEqual(first.id, second.id);
  assert.equal(first.status, 'draft');
  assert.deepEqual(Object.keys(first).sort(), ['design', 'id', 'name', 'ownerId', 'revision', 'status']);
  assert.notEqual(first.design, room.design);
});

test('cross-owner editing and copying are refused', () => {
  const room = source();
  assert.throws(() => editDesign(room, other, 0, room.design), /ACCESS_DENIED/);
  assert.throws(() => copyDesignToDraft(room, other), /ACCESS_DENIED/);
});

test('appearance edits do not freeze unrelated original room history', () => {
  const room = { ...source(), history: [] };
  const result = editDesign(room, owner, 0, room.design);
  room.history.push('new message');
  assert.equal(room.history.length, 1);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(room.history), false);
});

test('invalid geometry and duplicate controls are refused', () => {
  const design = structuredClone(defaultDesign());
  design.buttons[0].x = 95;
  assert.throws(() => validateDesign(design), /INVALID_DESIGN/);
  design.buttons[0].x = NaN;
  assert.throws(() => validateDesign(design), /INVALID_DESIGN/);
  const duplicate = structuredClone(defaultDesign());
  duplicate.buttons.push({ ...duplicate.buttons[0] });
  assert.throws(() => validateDesign(duplicate), /INVALID_DESIGN/);
});
