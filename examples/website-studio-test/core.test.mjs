import { test } from "node:test";
import assert from "node:assert/strict";
import { addItem, removeItem, total, localePacks, coreVersion } from "./core.mjs";
test("real calculator core: add, total, remove, reset", () => {
  let items = addItem([], "2", "10"); items = addItem(items, "3", "5");
  assert.equal(total(items), 35); items = removeItem(items, 0); assert.equal(total(items), 15);
  assert.equal(total([]), 0);
});
test("invalid input never produces NaN or Infinity", () => {
  for (const value of ["", " ", "abc", "-1", "Infinity", "1e400"]) assert.throws(() => addItem([], value, "10"));
});
test("one Core, two Locale Packs", () => {
  const items = addItem([], "2", "10");
  assert.equal(coreVersion, "studio-quote-1"); assert.notEqual(localePacks.en.add, localePacks.ko.add);
  assert.deepEqual(Object.keys(localePacks.en), Object.keys(localePacks.ko)); assert.equal(total(items), 20);
});
