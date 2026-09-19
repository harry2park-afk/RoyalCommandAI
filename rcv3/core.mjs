import { randomUUID } from 'node:crypto';

// This module has no imports from the old application and no provider credentials.
const capabilities = Object.freeze(['chat', 'secretary', 'files']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = () => { throw new Error('INVALID_DESIGN'); };
function fields(value, allowed) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).some(key => !allowed.includes(key))) fail();
}
function bounded(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail();
  return value;
}
function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}

// Only appearance can be supplied by customers. There are no script, endpoint,
// permissions, model or key fields. Render labels as text, never as HTML.
export function validateDesign(input) {
  fields(input, ['backgroundAssetId', 'buttons']);
  if (input.backgroundAssetId !== null &&
      (typeof input.backgroundAssetId !== 'string' || !uuid.test(input.backgroundAssetId))) fail();
  if (!Array.isArray(input.buttons) || input.buttons.length > 32) fail();
  const ids = new Set();
  const buttons = input.buttons.map(button => {
    fields(button, ['id', 'capability', 'label', 'x', 'y', 'width', 'height', 'opacity']);
    if (typeof button.id !== 'string' || !uuid.test(button.id) || ids.has(button.id.toLowerCase())) fail();
    ids.add(button.id.toLowerCase());
    if (!capabilities.includes(button.capability) || typeof button.label !== 'string' ||
        !button.label.trim() || button.label.length > 80) fail();
    const x = bounded(button.x, 0, 100);
    const y = bounded(button.y, 0, 100);
    const width = bounded(button.width, 4, 100);
    const height = bounded(button.height, 4, 100);
    if (x + width > 100 || y + height > 100) fail();
    return { id: button.id.toLowerCase(), capability: button.capability, label: button.label,
      x, y, width, height, opacity: bounded(button.opacity, 0, 1) };
  });
  return freeze({ backgroundAssetId: input.backgroundAssetId, buttons });
}

export function defaultDesign() {
  return validateDesign({ backgroundAssetId: null, buttons: [
    { id: randomUUID(), capability: 'chat', label: 'Chat', x: 5, y: 5, width: 20, height: 10, opacity: 1 },
  ] });
}

// Identity must come from a verified server session, never a client payload.
function requireOwner(room, authenticatedOwnerId) {
  if (typeof authenticatedOwnerId !== 'string' || !uuid.test(authenticatedOwnerId) ||
      room.ownerId !== authenticatedOwnerId) throw new Error('ACCESS_DENIED');
}

export function editDesign(room, authenticatedOwnerId, expectedRevision, candidate) {
  requireOwner(room, authenticatedOwnerId);
  if (expectedRevision !== room.revision) throw new Error('EDIT_CONFLICT');
  const design = validateDesign(candidate);
  // Moving or relabelling an existing button cannot reassign its function.
  for (const button of design.buttons) {
    const old = room.design.buttons.find(item => item.id === button.id);
    if (old && old.capability !== button.capability) throw new Error('CAPABILITY_LOCKED');
  }
  return Object.freeze({ ...room, revision: room.revision + 1, design });
}

// Produces an EMPTY draft, not a database insert or an activated room.
// Deliberate allowlist prevents copying tokens, history, jobs or approvals.
/** @param {any} source @param {(index: number) => string} newId */
export function portableDesign(source, newId = () => randomUUID()) {
  const design = validateDesign(source);
  const labels = { chat: 'My AI', secretary: 'Katie', files: 'Files' };
  return validateDesign({
    // Uploaded images and custom labels can themselves contain personal data.
    backgroundAssetId: null,
    buttons: design.buttons.map((button, index) => ({
      id: newId(index), capability: button.capability, label: labels[button.capability],
      x: button.x, y: button.y, width: button.width, height: button.height, opacity: button.opacity,
    })),
  });
}

export function copyDesignToDraft(source, authenticatedOwnerId) {
  requireOwner(source, authenticatedOwnerId);
  return freeze({
    id: randomUUID(), ownerId: authenticatedOwnerId, name: 'RCV3',
    status: 'draft', revision: 0, design: portableDesign(source.design),
  });
}
