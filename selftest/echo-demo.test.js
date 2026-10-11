import { test, assert } from '../core/harness.js';
import { computeEchoes, demoFlags } from '../core/echo-demo.js';

// Ten days (0 to 9). A on days 0, 2, 4, 6. B on days 1, 3, 5, 8.
// Window of 2 days: each A day has exactly one of the next two days with B (days 1, 3, 5, 8 respectively),
// so rate = 0.5 over 4 exposed days. Overall B rate = 4 / 10 = 0.4, so rr = 1.25.
const A_DAYS = [0, 2, 4, 6];
const B_DAYS = [1, 3, 5, 8];
const hand = {
  labels: [{ id: 0, text: 'A x', code: 'x' }, { id: 1, text: 'B y', code: 'y' }],
  days: Array.from({ length: 10 }, (_, day) => ({
    day,
    date: '',
    weekday: 0,
    labels: [A_DAYS.includes(day) ? 0 : -1, B_DAYS.includes(day) ? 1 : -1].filter((id) => id >= 0),
  })),
};
const TWO_DAY = [{ id: '2d', label: '2d', days: 2 }];

function pair(minExposedDays) {
  const echoes = computeEchoes(hand, TWO_DAY, { minExposedDays });
  return echoes.table.find((r) => r.exposure === 0 && r.outcome === 1);
}

test('hand-made input gives rate 0.5 and rate ratio 1.25 for A to B in 2 days', () => {
  const rec = pair(4);
  assert.equal(rec.nExposed, 4, 'exposed days');
  assert.equal(rec.rate, 0.5, 'rate');
  assert.equal(rec.baseline, 0.4, 'baseline');
  assert.ok(Math.abs(rec.rr - 1.25) < 1e-9, `rr ${rec.rr}`);
  assert.ok(Math.abs(rec.diff - 0.1) < 1e-9, `diff ${rec.diff}`);
});

test('rate, rr and diff are null when nExposed is below the minimum', () => {
  const rec = pair(5);
  assert.equal(rec.nExposed, 4, 'exposed days still reported');
  assert.equal(rec.rate, null, 'rate');
  assert.equal(rec.rr, null, 'rr');
  assert.equal(rec.diff, null, 'diff');
});

test('demo flags: lowSample below threshold, shortWindow for 1 day, none for null results', () => {
  assert.ok(demoFlags({ rr: 1, nExposed: 4 }, 30).includes('lowSample'), 'lowSample');
  assert.ok(demoFlags({ rr: 1, nExposed: 400 }, 1).includes('shortWindow'), 'shortWindow');
  assert.equal(demoFlags({ rr: 1, nExposed: 400 }, 30).length, 0, 'no flags expected');
  assert.equal(demoFlags({ rr: null, nExposed: 1 }, 1).length, 0, 'null result has no flags');
});
