// Shared logging factor and weekly cycle on the drift null (phase 4c, tier 4c.1; Node and browser). Structure, thinning
// and the weekly keep formula are checked by hand. The last two tests are statistical sanity checks; their ranges were
// written before the first run and are not edited afterwards.
import { test, assert } from '../core/harness.js';
import { generateShared, weeklyKeep } from '../core/synth-shared.js';
import { generateDrift } from '../core/synth-drift.js';
import { weekdayOf } from '../core/calendar.js';
import { statsDrift } from '../config/stats-drift.js';
import { statsShared } from '../config/stats-shared.js';

const TOLERANCE = 1e-12;
const FILLERS = 60;
const SEED = statsShared.seed;

test('generateShared: same seed gives the same output; another seed gives a different one', () => {
  const a = generateShared(statsShared, statsDrift, SEED, 'both', FILLERS);
  const b = generateShared(statsShared, statsDrift, SEED, 'both', FILLERS);
  assert.deepEqual(a, b, 'same seed differs');
  const c = generateShared(statsShared, statsDrift, SEED + 1, 'both', FILLERS);
  assert.ok(JSON.stringify(a.days) !== JSON.stringify(c.days), 'another seed gives the same days');
});

test('generateShared: day count, sorted unique label ids, entries consistent with days', () => {
  const out = generateShared(statsShared, statsDrift, SEED, 'shared', FILLERS);
  assert.equal(out.days.length, statsDrift.days, 'day count');
  assert.equal(out.labels.length, FILLERS, 'label count');
  const ids = out.labels.map((l) => l.id);
  assert.deepEqual(ids, [...ids].sort((x, y) => x - y), 'label ids not sorted');
  assert.equal(new Set(ids).size, ids.length, 'label ids not unique');
  assert.equal(out.entries.length, out.days.length, 'entry count');
  out.days.forEach((day, t) => {
    assert.deepEqual(out.entries[t].labels, day.labels, `entry ${t} labels differ from day ${t}`);
    assert.equal(out.entries[t].date, day.date, `entry ${t} date differs from day ${t}`);
  });
});

test('generateShared: thinning only removes; every label-day present in each mode is present in generateDrift', () => {
  const base = generateDrift(statsDrift, SEED, FILLERS);
  for (const mode of ['shared', 'weekly', 'both']) {
    const out = generateShared(statsShared, statsDrift, SEED, mode, FILLERS);
    out.days.forEach((day, t) => {
      const before = new Set(base.days[t].labels);
      for (const id of day.labels) assert.ok(before.has(id), `${mode}: label ${id} added on day ${t}`);
    });
  }
});

test('generateShared: an unknown mode is refused with the argument named', () => {
  assert.throws(() => generateShared(statsShared, statsDrift, SEED, 'monthly', FILLERS), 'mode must be one of');
});

test('weeklyKeep: hand values (amp 0 gives 1; amp 0.8 at phase 0 gives 1 on weekday 0 and 0.1551249475989248 on weekdays 3 and 4)', () => {
  for (const phase of [0, 2.5, 6.9]) {
    for (let w = 0; w < 7; w += 1) {
      assert.ok(Math.abs(weeklyKeep(0, phase, w) - 1) <= TOLERANCE, `amp 0 phase ${phase} weekday ${w}`);
    }
  }
  assert.ok(Math.abs(weeklyKeep(0.8, 0, 0) - 1) <= TOLERANCE, 'peak');
  assert.ok(Math.abs(weeklyKeep(0.8, 0, 3) - 0.1551249475989248) <= TOLERANCE, 'weekday 3');
  assert.ok(Math.abs(weeklyKeep(0.8, 0, 4) - 0.1551249475989248) <= TOLERANCE, 'weekday 4');
});

test('weeklyKeep: never below (1 - amp) / (1 + amp) = 1/9 for amp 0.8, over 7 weekdays and 20 phases', () => {
  const floor = (1 - 0.8) / (1 + 0.8);
  for (let i = 0; i < 20; i += 1) {
    const phase = i * 7 / 20;
    for (let w = 0; w < 7; w += 1) {
      assert.ok(weeklyKeep(0.8, phase, w) >= floor - TOLERANCE, `phase ${phase} weekday ${w}`);
    }
  }
  assert.ok(Math.abs(floor - 1 / 9) <= TOLERANCE, 'floor is not 1/9');
});

// Shared level effect (4c.1.3). Derivation, written BEFORE the first run and not changed afterwards: the level is
// independent of the labels, so the expected ratio of mean labels per low-level day to mean per high-level day is the
// ratio of the keep probabilities, 0.5. Both kinds of days interleave in runs of about 10 days (stay 0.9), so they
// average over the same label mix. The sampling sd of the ratio is about 0.05; 3 sd gives [0.35, 0.65].
const LEVEL_RATIO_MIN = 0.35;
const LEVEL_RATIO_MAX = 0.65;
test('shared level: mean labels per low-level day over mean per high-level day lies in [0.35, 0.65] on the default seed', () => {
  const out = generateShared(statsShared, statsDrift, SEED, 'shared', statsDrift.fillerCount);
  const high = [];
  const low = [];
  out.days.forEach((day, t) => {
    (out.meta.levels[t] === statsShared.levels.high ? high : low).push(day.labels.length);
  });
  assert.ok(high.length > 0 && low.length > 0, 'both levels must occur');
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ratio = mean(low) / mean(high);
  console.log(`shared level ratio (low over high, mean labels per day): ${ratio.toFixed(4)}; high days ${high.length}, low days ${low.length}`);
  assert.ok(ratio >= LEVEL_RATIO_MIN && ratio <= LEVEL_RATIO_MAX, `ratio ${ratio}`);
});

// Weekly effect (4c.1.3). Derivation, written BEFORE the first run and not changed afterwards: the seven weekdays are
// 2 pi / 7 apart, so the one closest to the peak is within 25.7 degrees and its cosine is at least 0.901; the weekday
// closest to the trough has a cosine of at most -0.901. For amp 0.5 the best keep is at least (1 + 0.5 x 0.901) / 1.5 =
// 0.967 and the worst at most (1 - 0.5 x 0.901) / 1.5 = 0.367, an expected ratio of at least 2.63. The limit 2 leaves room
// for sampling noise. The label is the one with the most presence days among the weekly labels with amp at least 0.5
// (the highest base rate), chosen before the run.
const WEEKLY_AMP_MIN = 0.5;
const WEEKLY_RATIO_MIN = 2;
test('weekly effect: for a label with amp at least 0.5, the best weekday rate over the worst is at least 2 on the default seed', () => {
  const base = generateDrift(statsDrift, SEED, statsDrift.fillerCount);
  const out = generateShared(statsShared, statsDrift, SEED, 'weekly', statsDrift.fillerCount);
  const candidates = out.meta.weekly.map((w, id) => ({ w, id })).filter((c) => c.w !== null && c.w.amp >= WEEKLY_AMP_MIN);
  assert.ok(candidates.length > 0, 'no weekly label with amp at least 0.5');
  const presence = (id) => base.days.reduce((n, day) => n + (day.labels.includes(id) ? 1 : 0), 0);
  const chosen = candidates.reduce((best, c) => (presence(c.id) > presence(best.id) ? c : best));
  const { id, w } = chosen;
  const perWeekday = Array.from({ length: 7 }, () => ({ present: 0, days: 0 }));
  const { first, last } = base.meta.active[id];
  out.days.forEach((day, t) => {
    if (t < first || t > last) return;
    const bucket = perWeekday[weekdayOf(day.date)];
    bucket.days += 1;
    if (day.labels.includes(id)) bucket.present += 1;
  });
  const rates = perWeekday.map((b) => (b.days > 0 ? b.present / b.days : 0));
  const ratio = Math.max(...rates) / Math.min(...rates);
  console.log(`weekly label ${id} (amp ${w.amp.toFixed(3)}, phase ${w.phase.toFixed(3)}): weekday rates ${rates.map((r) => r.toFixed(3)).join(', ')}; best over worst ${ratio.toFixed(3)}`);
  assert.ok(ratio >= WEEKLY_RATIO_MIN, `best over worst ${ratio}`);
});
