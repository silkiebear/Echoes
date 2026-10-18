// plantPair (phase 4d, 4d.1.4 and 4d.1.5; pure, Node and browser). Tolerances, written before the first run: each rate is
// checked against 3 standard deviations, sd = sqrt(p (1 - p) / n), with n the actual number of days in that group.
// For the default background (1100 days, pExposure 0.20, pBase 0.10, pGiven 0.20 for rate ratio 2) the expected sizes are
// n = 1100 for X, about 220 exposed days for the Y rate after X, and about 880 unexposed days for the Y rate without X.
import { test, assert } from '../core/harness.js';
import { generateDrift } from '../core/synth-drift.js';
import { plantPair, powerLabelIds } from '../core/synth-power.js';
import { statsDrift } from '../config/stats-drift.js';
import { statsPower } from '../config/stats-power.js';

const SIGMAS = 3;
const SEED = statsPower.seed;
const CFG = { pExposure: statsPower.pExposure, pBase: statsPower.pBase, pGiven: 0.2, lag: statsPower.lag };
const base = generateDrift(statsDrift, SEED, 60);
const planted = plantPair(base, CFG, SEED);
const { exposure, outcome } = powerLabelIds(planted);

function within(observed, p, n) {
  return Math.abs(observed - p) <= SIGMAS * Math.sqrt(p * (1 - p) / n);
}

test('plantPair: adds exactly two labels and keeps the base labels, days and entries', () => {
  assert.equal(planted.labels.length, base.labels.length + 2, 'label count');
  assert.deepEqual(planted.labels.slice(0, base.labels.length), base.labels, 'base labels unchanged');
  assert.deepEqual(planted.labels.slice(-2).map((l) => l.text), ['Power X', 'Power Y'], 'texts');
  assert.equal(planted.days.length, base.days.length, 'days');
  assert.equal(planted.entries.length, base.entries.length, 'entries');
  planted.days.forEach((day, t) => {
    const kept = day.labels.filter((id) => id < base.labels.length);
    assert.deepEqual(kept, base.days[t].labels, `base labels on day ${t}`);
    assert.equal(day.date, base.days[t].date, `date on day ${t}`);
  });
  planted.entries.forEach((e, i) => {
    assert.equal(e.day, i, `entry ${i} day index`);
    assert.deepEqual(e.labels, planted.days[e.day].labels, `entry ${i} labels`);
  });
});

test('plantPair: every label id is in range and no day lists a label twice', () => {
  for (const day of planted.days) {
    assert.ok(day.labels.every((id) => Number.isInteger(id) && id >= 0 && id < planted.labels.length), `day ${day.day} ids`);
    assert.equal(new Set(day.labels).size, day.labels.length, `day ${day.day} duplicates`);
  }
});

test('plantPair: the same inputs give the same output; another seed gives another pattern', () => {
  assert.deepEqual(plantPair(base, CFG, SEED), planted, 'same seed');
  const other = plantPair(base, CFG, SEED + 1);
  const xDays = (d) => d.days.map((day) => day.labels.includes(exposure));
  assert.ok(JSON.stringify(xDays(other)) !== JSON.stringify(xDays(planted)), 'other seed');
});

test('plantPair: Power X is present on about pExposure of the days (within 3 standard deviations)', () => {
  const n = planted.days.length;
  const share = planted.days.filter((day) => day.labels.includes(exposure)).length / n;
  assert.ok(within(share, CFG.pExposure, n), `X share ${share}`);
});

test('plantPair: Power Y after X is near pGiven and otherwise near pBase (within 3 standard deviations)', () => {
  const after = [];
  const otherwise = [];
  for (let t = CFG.lag; t < planted.days.length; t++) {
    const y = planted.days[t].labels.includes(outcome) ? 1 : 0;
    if (planted.days[t - CFG.lag].labels.includes(exposure)) after.push(y);
    else otherwise.push(y);
  }
  const rateAfter = after.reduce((s, v) => s + v, 0) / after.length;
  const rateOtherwise = otherwise.reduce((s, v) => s + v, 0) / otherwise.length;
  assert.ok(within(rateAfter, CFG.pGiven, after.length), `Y after X ${rateAfter} over ${after.length} days`);
  assert.ok(within(rateOtherwise, CFG.pBase, otherwise.length), `Y otherwise ${rateOtherwise} over ${otherwise.length} days`);
});
