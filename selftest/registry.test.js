import { test, assert } from '../core/harness.js';
import { checkModules } from '../core/registry.js';

function good(id, order = 10) {
  return { id, title: id, phase: 0, order, mount() {} };
}

test('a valid module is accepted', () => {
  const r = checkModules([{ source: 'a.js', mod: good('a') }]);
  assert.equal(r.modules.length, 1);
  assert.equal(r.errors.length, 0);
});

test('a duplicate id is rejected', () => {
  const r = checkModules([
    { source: 'a.js', mod: good('a') },
    { source: 'b.js', mod: good('a') },
  ]);
  assert.equal(r.modules.length, 1);
  assert.equal(r.errors.length, 1);
  assert.ok(r.errors[0].reason.includes('duplicate'), r.errors[0].reason);
});

test('a missing field is rejected', () => {
  const noMount = { id: 'a', title: 'A', phase: 0, order: 1 };
  const noOrder = { id: 'b', title: 'B', phase: 0, mount() {} };
  const r = checkModules([
    { source: 'a.js', mod: noMount },
    { source: 'b.js', mod: noOrder },
  ]);
  assert.equal(r.modules.length, 0);
  assert.equal(r.errors.length, 2);
  assert.ok(r.errors[0].reason.includes('mount'), r.errors[0].reason);
  assert.ok(r.errors[1].reason.includes('order'), r.errors[1].reason);
});

test('modules are sorted by order', () => {
  const r = checkModules([
    { source: 'a.js', mod: good('a', 30) },
    { source: 'b.js', mod: good('b', 10) },
    { source: 'c.js', mod: good('c', 20) },
  ]);
  assert.deepEqual(r.modules.map((m) => m.id), ['b', 'c', 'a']);
});
