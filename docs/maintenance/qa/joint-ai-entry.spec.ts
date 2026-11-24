/** Opt-in DOM regression; see JOINT_AI_ENTRY_20261124.md for the runner. No live API calls. */
import { createRequire } from 'node:module';
import { act, createElement, Profiler } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import IndependentAIRooms from '../../../src/app/rooms/[id]/IndependentAIRooms';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'rca' }) }));
vi.mock('@/components/DomainRuntimeProvider', () => ({ useDomainRuntime: () => ({ locale: 'en-AU' }) }));
vi.mock('@/components/rcv3-toolbox/V4HomeLink', () => ({ default: () => null }));
const require = createRequire(import.meta.url);
const { JSDOM } = require(process.env.RC_QA_JSDOM || 'jsdom');
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://fixture.invalid/rooms/rca' });
for (const name of ['window', 'document', 'navigator', 'localStorage', 'HTMLElement', 'Element', 'MouseEvent', 'KeyboardEvent', 'Event', 'MutationObserver']) {
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let hydrateRoot: typeof import('react-dom/client').hydrateRoot;
let root: ReturnType<typeof hydrateRoot> | undefined;
const host = document.getElementById('root')!;
const ids = ['openai', 'anthropic', 'google', 'xai', 'codex'];
const selectedKey = 'royalcommand:independent-ai:v1:rca:selected';
const historyKey = 'royalcommand:independent-ai:v1:rca:openai:history';
beforeAll(async () => { ({ hydrateRoot } = await import('react-dom/client')); });
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; host.innerHTML = ''; localStorage.clear(); vi.unstubAllGlobals(); });
function snapshot() {
  const grid = host.querySelector<HTMLElement>('[data-rc-multi-ai-grid]')!;
  return { hidden: grid.style.visibility === 'hidden', names: [...grid.querySelectorAll<HTMLElement>('[data-rc-multi-ai-card]')].filter(x => x.style.display !== 'none').map(x => x.querySelector('h3')!.textContent), count: [...grid.children].filter(x => (x as HTMLElement).style.display !== 'none').length };
}
async function mount(selected?: string[]) {
  if (selected !== undefined) localStorage.setItem(selectedKey, JSON.stringify(selected));
  const history = [{ id: 'q', role: 'user', content: 'Saved question', createdAt: '2026-11-24T00:00:00Z' }, { id: 'a', role: 'assistant', content: 'Saved answer', createdAt: '2026-11-24T00:01:00Z' }];
  localStorage.setItem(historyKey, JSON.stringify(history));
  let resolve!: (data: unknown) => void;
  let reject!: (reason: unknown) => void;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (init?.method && init.method !== 'GET') throw new Error('Unexpected write: ' + url);
    calls.push(url);
    if (url === '/api/ai/providers') return pending;
    return Promise.resolve({ ok: true, json: async () => ({ rooms: [], conversations: [] }) });
  }));
  const errors: unknown[] = [];
  host.innerHTML = renderToString(createElement(IndependentAIRooms, { roomId: 'rca' }));
  expect(snapshot().hidden).toBe(true); // Integrator must not appear by itself during hydration.
  const paints: ReturnType<typeof snapshot>[] = [];
  await act(async () => { root = hydrateRoot(host, createElement(Profiler, { id: 'entry', onRender: () => { if (host.querySelector('[data-rc-multi-ai-grid]')) paints.push(snapshot()); } }, createElement(IndependentAIRooms, { roomId: 'rca' })), { onRecoverableError: error => errors.push(error) }); });
  expect(errors).toEqual([]);
  expect(snapshot().hidden).toBe(false);
  expect(localStorage.getItem(historyKey)).toBe(JSON.stringify(history));
  return { resolve, reject, paints, calls, history };
}
test('delayed provider lookup: first visible paint has all six panels; completion does not change layout', async () => {
  const run = await mount();
  const before = snapshot();
  expect(before.count).toBe(6);
  expect(before.names).toEqual(['ChatGPT', 'Claude', 'Gemini', 'Grok', 'Codex']);
  expect(host.textContent).toContain('Checking connection…');
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Ask ChatGPT"]')!.disabled).toBe(true);
  expect(run.paints.filter(x => !x.hidden).every(x => x.count === 6)).toBe(true);
  await act(async () => run.resolve({ ok: true, json: async () => ({ connectors: ids.map(id => ({ id, available: true, configured: true })) }) }));
  expect(snapshot()).toEqual(before);
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Ask ChatGPT"]')!.disabled).toBe(false);
  expect(host.textContent).not.toContain('Checking connection…');
  expect(run.calls.every(x => !x.includes('/independent'))).toBe(true);
  const open = [...host.querySelectorAll('button')].find(x => x.textContent === 'Open')!;
  await act(async () => open.click());
  expect(host.textContent).toContain('Saved answer');
});
test('failed lookup preserves all six panels and disables AI sending', async () => {
  const run = await mount();
  const before = snapshot();
  await act(async () => run.reject(new Error('Fixture network failure')));
  expect(snapshot()).toEqual(before);
  expect(host.textContent).toContain('Not connected');
  expect([...host.querySelectorAll<HTMLTextAreaElement>('[data-rc-multi-ai-card] textarea')].every(x => x.disabled)).toBe(true);
  expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
});
test('partial availability keeps selected panels; unavailable AI stays disabled', async () => {
  const run = await mount();
  const before = snapshot();
  await act(async () => run.resolve({ ok: true, json: async () => ({ connectors: [{ id: 'openai', available: true, configured: true }] }) }));
  expect(snapshot()).toEqual(before);
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Ask ChatGPT"]')!.disabled).toBe(false);
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Ask Claude"]')!.disabled).toBe(true);
});
test.each([['subset', ['openai', 'google'], 3], ['empty', [], 1]] as const)('restores saved %s before revealing layout without forcing default AI selection', async (_name, selection, count) => {
  const run = await mount([...selection]);
  expect(snapshot().count).toBe(count);
  expect(run.paints.filter(x => !x.hidden).every(x => x.count === count)).toBe(true);
  expect(localStorage.getItem(selectedKey)).toBe(JSON.stringify(selection));
  await act(async () => run.resolve({ ok: true, json: async () => ({ connectors: ids.map(id => ({ id, available: true, configured: true })) }) }));
  expect(snapshot().count).toBe(count);
  expect(localStorage.getItem(selectedKey)).toBe(JSON.stringify(selection));
});
test('reused component entering RCA hides previous room selection until RCA selection is restored', async () => {
  await mount();
  localStorage.setItem('royalcommand:independent-ai:v1:other:selected', JSON.stringify(['anthropic']));
  await act(async () => root!.render(createElement(Profiler, { id: 'entry', onRender: () => {} }, createElement(IndependentAIRooms, { roomId: 'other' }))));
  localStorage.setItem(selectedKey, JSON.stringify(['google']));
  const paints: ReturnType<typeof snapshot>[] = [];
  await act(async () => root!.render(createElement(Profiler, { id: 'entry', onRender: () => paints.push(snapshot()) }, createElement(IndependentAIRooms, { roomId: 'rca' }))));
  expect(paints[0].hidden).toBe(true);
  expect(paints.filter(x => !x.hidden).every(x => x.names.join(',') === 'Gemini')).toBe(true);
  expect(snapshot().count).toBe(2);
});
test('HTTP provider failure keeps selected layout without enabling a provider', async () => {
  const run = await mount();
  await act(async () => run.resolve({ ok: false }));
  expect(snapshot().count).toBe(6);
  expect(host.textContent).toContain('Not connected');
  expect([...host.querySelectorAll<HTMLTextAreaElement>('[data-rc-multi-ai-card] textarea')].every(x => x.disabled)).toBe(true);
});
