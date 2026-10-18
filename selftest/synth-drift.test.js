// Self-tests for the drift null generator (phase 4b, tier 4b.1). Structural checks only: no statistical ranges.
import { test, assert } from '../core/harness.js';
import { generateDrift } from '../core/synth-drift.js';
import { statsDrift } from '../config/stats-drift.js';

const SMALL = 20;
const LARGER = 40;

// Labels present on one day, from the entries array.
const idsOnDay = (data, t) => data.entries[t].labels;

test('same seed gives the same data, another seed differs', () => {
  const a = generateDrift(statsDrift, statsDrift.seed, SMALL);
  const b = generateDrift(statsDrift, statsDrift.seed, SMALL);
  const c = generateDrift(statsDrift, statsDrift.seed + 1, SMALL);
  assert.deepEqual(a, b, 'same seed is deterministic');
  assert.ok(JSON.stringify(a.entries) !== JSON.stringify(c.entries), 'another seed gives other data');
});

test('one entry and one day record per day', () => {
  const data = generateDrift(statsDrift, statsDrift.seed, SMALL);
  assert.equal(data.entries.length, statsDrift.days, 'entry count equals days');
  assert.equal(data.days.length, statsDrift.days, 'day count equals days');
  assert.ok(data.entries.every((e) => e.minutes === null), 'no time of day');
});

test('no label is present outside its active period', () => {
  const data = generateDrift(statsDrift, statsDrift.seed, SMALL);
  const { active } = data.meta;
  for (let t = 0; t < data.entries.length; t += 1) {
    for (const id of idsOnDay(data, t)) {
      const { first, last } = active[id];
      assert.ok(t >= first && t <= last, `label ${id} present on day ${t} outside its period`);
    }
  }
});

test('every active period is at least activeMinFraction of the days and ends in range', () => {
  const data = generateDrift(statsDrift, statsDrift.seed, SMALL);
  const minLen = statsDrift.activeMinFraction * statsDrift.days;
  assert.equal(data.meta.active.length, SMALL, 'one period per label');
  for (const { first, last } of data.meta.active) {
    assert.ok(last - first + 1 >= minLen, 'period length at least the minimum');
    assert.ok(first >= 0 && last < statsDrift.days, 'period inside the days');
  }
});

test('labels are sorted, unique, and ids on each day are strictly increasing', () => {
  const data = generateDrift(statsDrift, statsDrift.seed, SMALL);
  assert.deepEqual(data.labels.map((l) => l.id), Array.from({ length: SMALL }, (_, i) => i), 'ids in order');
  assert.equal(new Set(data.labels.map((l) => l.text)).size, SMALL, 'texts unique');
  for (const e of data.entries) {
    for (let k = 1; k < e.labels.length; k += 1) {
      assert.ok(e.labels[k - 1] < e.labels[k], 'ids strictly increasing on a day');
    }
  }
});

test('streak labels are the share of fillers given by streakShare', () => {
  const data = generateDrift(statsDrift, statsDrift.seed, SMALL);
  const streaks = data.meta.kind.filter((k) => k === 'streak').length;
  assert.equal(streaks, Math.floor(statsDrift.streakShare * SMALL), 'streak count');
});

test('adding fillers does not change earlier labels', () => {
  const small = generateDrift(statsDrift, statsDrift.seed, SMALL);
  const large = generateDrift(statsDrift, statsDrift.seed, LARGER);
  const earlier = (ids) => ids.filter((id) => id < SMALL);
  for (let t = 0; t < statsDrift.days; t += 1) {
    assert.deepEqual(earlier(idsOnDay(large, t)), earlier(idsOnDay(small, t)), `day ${t} unchanged`);
  }
  assert.deepEqual(large.meta.active.slice(0, SMALL), small.meta.active, 'earlier periods unchanged');
  assert.deepEqual(large.meta.kind.slice(0, SMALL), small.meta.kind, 'earlier kinds unchanged');
});
