// Common weekly phase (phase 4d, 4d.1.2; pure, Node and browser). The four existing modes are fingerprinted from the code
// before the change (default seed, default fillers): the same bytes must come out. The new modes only thin the drift
// null, give every weekly label one phase, and keep the weekday pattern strong enough to see.
// Derivation of the ratio limit (written before the first run): keep = (1 + 0.8 cos(2 pi (w - phase) / 7)) / 1.8. The
// nearest weekday to the peak has cos at or above cos(pi / 7) = 0.901, so keep is at or above 0.950; the nearest weekday to
// the trough has cos at or below -0.901, so keep is at or below 0.155. The exact best-to-worst ratio is at least 6.1 for any
// phase; the test asks for 2.
import { test, assert } from '../core/harness.js';
import { generateDrift } from '../core/synth-drift.js';
import { generateShared } from '../core/synth-shared.js';
import { weekdayOf } from '../core/calendar.js';
import { statsDrift } from '../config/stats-drift.js';
import { statsShared } from '../config/stats-shared.js';

function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const SEED = statsShared.seed;
const FILLERS = statsDrift.fillerCount;
const RATIO_MIN = 2;
const base = generateDrift(statsDrift, SEED, FILLERS);

// Fingerprints from the code before 4d.1.2 (default seed 20261018, 60 fillers): the hash is of the day label lists
// (and, for the shared and weekly modes, the levels and the weekly parameters); kept is the number of label presences.
const BEFORE = {
  none: { hash: '11f8ee9a' },
  shared: { hash: '14fd1d8e', kept: 4514 },
  weekly: { hash: 'b61dc8a6', kept: 4884 },
  both: { hash: '37cf9f37', kept: 3877 },
};

test('existing modes: none, shared, weekly and both print the same days as before 4d.1.2', () => {
  assert.equal(fnv(JSON.stringify(base.days.map((d) => d.labels))), BEFORE.none.hash, 'none');
  for (const mode of ['shared', 'weekly', 'both']) {
    const d = generateShared(statsShared, statsDrift, SEED, mode, FILLERS);
    const kept = d.days.reduce((s, day) => s + day.labels.length, 0);
    const hash = fnv(JSON.stringify([d.days.map((x) => x.labels), d.meta.levels, d.meta.weekly]));
    assert.deepEqual({ hash, kept }, { hash: BEFORE[mode].hash, kept: BEFORE[mode].kept }, mode);
  }
});

test('common modes only thin the drift null: every kept label was present in the base day', () => {
  for (const mode of ['weekly-common', 'both-common']) {
    const d = generateShared(statsShared, statsDrift, SEED, mode, FILLERS);
    d.days.forEach((day, t) => {
      for (const id of day.labels) assert.ok(base.days[t].labels.includes(id), `${mode}: day ${t} label ${id} was not in the base`);
    });
    assert.equal(d.days.length, base.days.length, `${mode}: days`);
  }
});

test('common modes: every weekly label has one phase and the exact amplitude; the first share of labels is weekly', () => {
  const cut = Math.floor(statsShared.weekly.share * base.labels.length);
  for (const mode of ['weekly-common', 'both-common']) {
    const d = generateShared(statsShared, statsDrift, SEED, mode, FILLERS);
    const weekly = d.meta.weekly.filter((w) => w !== null);
    assert.equal(weekly.length, cut, `${mode}: weekly labels`);
    assert.ok(weekly.every((w) => w.phase === weekly[0].phase), `${mode}: one phase`);
    assert.ok(weekly.every((w) => w.amp === statsShared.weekly.ampMax), `${mode}: exact amplitude`);
    assert.ok(d.meta.weekly.slice(cut).every((w) => w === null), `${mode}: no cycle after the cut`);
  }
});

test('common modes: the best-to-worst weekday rate of the most common weekly label is at least 2', () => {
  const d = generateShared(statsShared, statsDrift, SEED, 'weekly-common', FILLERS);
  const cut = Math.floor(statsShared.weekly.share * base.labels.length);
  let top = 0;
  for (let id = 0; id < cut; id++) {
    const count = base.days.filter((day) => day.labels.includes(id)).length;
    if (count > base.days.filter((day) => day.labels.includes(top)).length) top = id;
  }
  const rates = [0, 1, 2, 3, 4, 5, 6].map((wd) => {
    let before = 0;
    let after = 0;
    d.days.forEach((day, t) => {
      if (weekdayOf(day.date) !== wd) return;
      if (base.days[t].labels.includes(top)) before += 1;
      if (day.labels.includes(top)) after += 1;
    });
    return after / before;
  });
  const ratio = Math.max(...rates) / Math.min(...rates);
  assert.ok(ratio >= RATIO_MIN, `best over worst ${ratio.toFixed(2)}`);
});

// Half mode (phase 4d, G7b): the shared factor acts on a random half of the labels only.
test('shared-half: thinning only, exactly floor(halfShare x count) labels are in the half, and only they lose presence', () => {
  const d = generateShared(statsShared, statsDrift, SEED, 'shared-half', FILLERS);
  const half = d.meta.half;
  assert.equal(half.length, base.labels.length, 'half flags per label');
  assert.equal(half.reduce((s, v) => s + v, 0), Math.floor(statsShared.halfShare * base.labels.length), 'half size');
  let lost = 0;
  d.days.forEach((day, t) => {
    for (const id of base.days[t].labels) {
      const kept = day.labels.includes(id);
      if (!kept) {
        assert.equal(half[id], 1, `label ${id} outside the half lost day ${t}`);
        lost += 1;
      }
    }
    for (const id of day.labels) assert.ok(base.days[t].labels.includes(id), `day ${t} label ${id} was not in the base`);
  });
  assert.ok(lost > 0, 'the shared factor removes some presences');
});
