import { test, assert, runAll } from '../core/harness.js';

test('assert.ok accepts truthy and rejects falsy values', () => {
  assert.ok(1);
  assert.throws(() => assert.ok(0), 'truthy');
});

test('assert.equal compares with Object.is', () => {
  assert.equal(3, 3);
  assert.equal(NaN, NaN);
  assert.throws(() => assert.equal(1, 2), 'expected 2');
});

test('assert.deepEqual compares nested structures', () => {
  assert.deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] });
  assert.throws(() => assert.deepEqual({ a: 1 }, { a: 2 }), 'structures differ');
  assert.throws(() => assert.deepEqual([1], { 0: 1 }), 'structures differ');
});

test('assert.throws reports a missing throw', () => {
  assert.throws(() => assert.throws(() => 1), 'expected a throw');
});

test('runAll with an empty list reports zero results', async () => {
  const r = await runAll([], new URL('../', import.meta.url));
  assert.deepEqual([r.passed, r.failed, r.skipped, r.results.length], [0, 0, 0, 0]);
});

test('runAll reports an unloadable file as a failure', async () => {
  const r = await runAll(['./selftest/does-not-exist.test.js'], new URL('../', import.meta.url));
  assert.equal(r.failed, 1);
  assert.equal(r.results[0].status, 'fail');
});
