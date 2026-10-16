import { test, assert } from '../core/harness.js';
import { rateStats } from '../core/stats/rate.js';

const near = (a, b, tol) => (a === null || b === null ? a === b : Math.abs(a - b) <= tol);

test('rateStats on the given tables', () => {
  let r = rateStats(3, 10, 6, 40);
  assert.equal(r.rate, 0.3, 'rate');
  assert.equal(r.base, 0.15, 'base');
  assert.equal(r.rr, 2, 'ratio');
  assert.equal(r.diff, 0.15, 'difference');

  r = rateStats(3, 10, 0, 40);
  assert.equal(r.rate, 0.3, 'rate');
  assert.equal(r.base, 0, 'base zero');
  assert.equal(r.rr, null, 'ratio null when base is 0');
  assert.equal(r.diff, 0.3, 'difference');

  r = rateStats(0, 0, 6, 40);
  assert.equal(r.rate, null, 'rate null when n is 0');
  assert.equal(r.base, 0.15, 'base');
  assert.equal(r.rr, null, 'ratio null when rate is null');
  assert.equal(r.diff, null, 'difference null when rate is null');

  r = rateStats(5, 10, 10, 10);
  assert.equal(r.rate, 0.5, 'rate');
  assert.equal(r.base, 1, 'base');
  assert.equal(r.rr, 0.5, 'ratio');
  assert.equal(r.diff, -0.5, 'difference');

  r = rateStats(1, 1, 1, 0);
  assert.equal(r.base, null, 'base null when N is 0');
  assert.equal(r.rr, null, 'ratio null when base is null');
  assert.equal(r.diff, null, 'difference null when base is null');
});

test('rateStats fields are always number or null', () => {
  const r = rateStats(3, 10, 6, 40);
  for (const key of ['rate', 'base', 'rr', 'diff']) {
    assert.ok(r[key] === null || typeof r[key] === 'number', `${key} is number or null`);
  }
  assert.ok(near(rateStats(6, 20, 12, 40).rr, 1, 1e-12), 'ratio one when rates match');
});
