import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
// Execute generated code only in the credential-free, deny-all Sandbox.
const { addItem, removeItem, total, localePacks } = await import(pathToFileURL(resolve('public/core.mjs')).href);
let items = addItem([], '2', '10');
items = addItem(items, '3', '5'); assert.equal(total(items), 35);
assert.equal(total(removeItem(items, 0)), 15);
for (const value of ['-1', '', 'abc', 'Infinity']) assert.throws(() => addItem(items, value, '10'));
assert.equal(total([]), 0);
assert.equal(localePacks.en.total, 'Total'); assert.equal(localePacks.ko.total, '합계');
