import { test, assert } from '../core/harness.js';
import { prepare } from '../core/stats/prepare.js';
import { outcomeMasks, exposedCounts } from '../core/stats/cell-counts.js';
import { fisherTwoSided } from '../core/stats/exact.js';
import { rateStats } from '../core/stats/rate.js';
import { scanCells } from '../core/stats/scan.js';
import { stats } from '../config/stats.js';
import { settingsConfig } from '../config/settings.js';
import { timeDiversity } from '../config/flags.js';
import { buildQuality } from '../core/quality.js';
import { defaultSettings } from '../core/settings.js';
import { generateWide } from '../core/synth-wide.js';
import { statsSynth } from '../config/stats-synth.js';
import { strataGeometry } from '../core/stats/strata.js';
import { restrictedCell, restrictedCellBanded, bandTotals, maskPrefixes } from '../core/stats/cell-counts.js';
import { generateDrift } from '../core/synth-drift.js';
import { statsDrift } from '../config/stats-drift.js';

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const TOL = 1e-12;

function expectNear(actual, expected, msg) {
  assert.ok(near(actual, expected, TOL), `${msg}: expected ${expected}, got ${actual}`);
}

// Logging-volume bands (phase 4d, option B). Hand case: 6 days in blocks of 3, distinct labels per day 2 1 3 | 3 1 2.
// Block 0 ranked by (volume, day): day 1 (1), day 0 (2), day 2 (3) -> bands 0, 1, 2. Block 1: day 4 (1), day 5 (2),
// day 3 (3) -> bands 0, 1, 2. Stratum index = block x 3 + band: [1, 0, 2, 5, 3, 4].
function toyPrepared() {
  return {
    n: 6,
    labelCount: 3,
    observed: new Uint8Array(6).fill(1),
    labelDays: [Int32Array.from([0, 1, 2, 3, 4, 5]), Int32Array.from([0, 2, 3, 5]), Int32Array.from([2, 3])],
    first: Int32Array.from([0, 0, 2]),
    last: Int32Array.from([5, 5, 3]),
  };
}

test('logging-volume bands, hand case: the strata index and the per-stratum totals match the hand count', () => {
  const p = toyPrepared();
  const geo = strataGeometry(p, 3, 3);
  assert.deepEqual(Array.from(geo.index), [1, 0, 2, 5, 3, 4], 'index');
  assert.equal(geo.count, 6, 'strata');
  // Outcome evaluable on days 0 to 4, hit on days 1, 2 and 4 (its window hits).
  const masks = { evaluable: Uint8Array.from([1, 1, 1, 1, 1, 0]), hit: Uint8Array.from([0, 1, 1, 0, 1, 0]) };
  const totals = bandTotals(p, masks, geo);
  assert.deepEqual(Array.from(totals.totN), [1, 1, 1, 1, 0, 1], 'evaluable days per stratum');
  assert.deepEqual(Array.from(totals.totK), [1, 0, 1, 1, 0, 0], 'hit days per stratum');
  const cell = restrictedCellBanded(p, 1, masks, totals, geo);
  assert.deepEqual(
    { N: cell.N, K: cell.K, n: cell.n, k: cell.k, strata: cell.strata },
    { N: 5, K: 3, n: 3, k: 1, strata: [{ N: 1, K: 0, n: 1, k: 0 }, { N: 1, K: 1, n: 1, k: 1 }, { N: 1, K: 0, n: 1, k: 0 }] },
    'cell of Label 1',
  );
});

test('logging-volume bands: with one band the banded counts equal the 4b counts for every cell of a generated pair', () => {
  const data = generateDrift(statsDrift, statsDrift.seed, 12);
  const p = prepare({ data, settings: defaultSettings() });
  const geo = strataGeometry(p, stats.strata.days, 1);
  let checked = 0;
  for (let o = 0; o < p.labelCount; o += 1) {
    for (const w of [1, 7]) {
      const masks = outcomeMasks(p, o, w, stats.minWindowCoverage);
      const pre = maskPrefixes(masks, p.n);
      const totals = bandTotals(p, masks, geo);
      for (let e = 0; e < p.labelCount; e += 1) {
        if (p.labelDays[e].length === 0) continue;
        const old = restrictedCell(p, e, masks, pre, geo);
        const banded = restrictedCellBanded(p, e, masks, totals, geo);
        assert.deepEqual(banded, old, `pair ${e} -> ${o} window ${w}`);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 0, 'some cells checked');
});

test('logging-volume bands: three bands keep every total of the 4b counts and split the strata of each cell', () => {
  const data = generateDrift(statsDrift, statsDrift.seed, 12);
  const p = prepare({ data, settings: defaultSettings() });
  const geo1 = strataGeometry(p, stats.strata.days, 1);
  const geo3 = strataGeometry(p, stats.strata.days, 3);
  for (let o = 0; o < p.labelCount; o += 1) {
    const masks = outcomeMasks(p, o, 7, stats.minWindowCoverage);
    const pre = maskPrefixes(masks, p.n);
    const totals3 = bandTotals(p, masks, geo3);
    for (let e = 0; e < p.labelCount; e += 1) {
      if (p.labelDays[e].length === 0) continue;
      const old = restrictedCell(p, e, masks, pre, geo1);
      const banded = restrictedCellBanded(p, e, masks, totals3, geo3);
      assert.deepEqual([banded.N, banded.K, banded.n, banded.k], [old.N, old.K, old.n, old.k], `totals ${e} -> ${o}`);
      assert.equal(banded.strata.reduce((s, x) => s + x.n, 0), banded.n, 'strata hold every exposed day');
      assert.equal(banded.strata.reduce((s, x) => s + x.k, 0), banded.k, 'strata hold every exposed hit');
    }
  }
});

test('logging-volume bands: each block splits its observed days into bands that differ by at most one day', () => {
  const data = generateDrift(statsDrift, statsDrift.seed, 60);
  const p = prepare({ data, settings: defaultSettings() });
  const geo = strataGeometry(p, stats.strata.days, 3);
  const sizes = new Map();
  for (let t = geo.base; t < p.n; t += 1) {
    if (!p.observed[t]) continue;
    const s = geo.index[t];
    sizes.set(s, (sizes.get(s) || 0) + 1);
  }
  for (let bl = 0; bl < geo.blocks; bl += 1) {
    const counts = [0, 1, 2].map((q) => sizes.get(bl * 3 + q) || 0);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `block ${bl}: ${counts.join(' ')}`);
  }
});

// Ten days. Label 0 is the exposure, label 1 the outcome. Unobserved days have no labels and no entries.
function toyData(exposureDays, outcomeDays, unobserved = []) {
  const days = [];
  for (let t = 0; t < 10; t += 1) {
    const observed = !unobserved.includes(t);
    const labels = [];
    if (exposureDays.includes(t)) labels.push(0);
    if (outcomeDays.includes(t)) labels.push(1);
    days.push({
      day: t,
      date: `2022-01-${String(t + 1).padStart(2, '0')}`,
      labels: observed ? labels : [],
      entryCount: observed ? 1 : 0,
      moods: [],
    });
  }
  return { labels: [{ id: 0, text: 'E' }, { id: 1, text: 'O' }], moodNames: [], entries: [], days };
}

test('toy 1: exposure on 1, 4, 7 and outcome on 2, 3, 5, 8 at window 2 gives (2, 2, 5, 6), rr 1.2, diff 1/6, p 1', () => {
  const p = prepare({ data: toyData([1, 4, 7], [2, 3, 5, 8]), settings: defaultSettings() });
  const m = outcomeMasks(p, 1, 2, 0.5);
  const c = exposedCounts(p, 0, m);
  assert.deepEqual([c.k, c.n, m.K, m.N], [2, 2, 5, 6], 'counts');
  const r = rateStats(c.k, c.n, m.K, m.N);
  expectNear(r.rr, 1.2, 'rate ratio');
  expectNear(r.diff, 1 / 6, 'difference');
  expectNear(fisherTwoSided(c.k, c.n, m.K, m.N), 1, 'two-sided p');
});

// Phase 3 counts and p (the fisher path): the stratified default restricts the counts to the active period and
// leaves a cell with a variance below minVariance untested, so this count check pins scanTest to 'fisher'.
test('toy 1 through scanCells: the same cell is tested with the same counts', async () => {
  const p = prepare({ data: toyData([1, 4, 7], [2, 3, 5, 8]), settings: defaultSettings() });
  const cfg = { ...stats, windows: [{ id: 'w2', days: 2 }], minExposed: 1, scanTest: 'fisher' };
  const cells = [];
  await scanCells(p, cfg, { onCell: (c) => cells.push(c) });
  const cell = cells.find((c) => c.e === 0 && c.o === 1);
  assert.ok(cell, 'cell E to O is tested');
  assert.deepEqual([cell.k, cell.n, cell.K, cell.N], [2, 2, 5, 6], 'counts');
  expectNear(cell.p, 1, 'p');
});

test('toy 2 with coverage 0.5: observed gap at day 3 leaves N 5, K 4, exposed (2, 2)', () => {
  const p = prepare({ data: toyData([1, 4, 7], [2, 5, 6, 8], [3]), settings: defaultSettings() });
  const m = outcomeMasks(p, 1, 2, 0.5);
  const c = exposedCounts(p, 0, m);
  assert.deepEqual([c.k, c.n, m.K, m.N], [2, 2, 4, 5], 'counts');
  expectNear(rateStats(c.k, c.n, m.K, m.N).rr, 1.25, 'rate ratio');
});

test('toy 2 with coverage 1.0: only days 4, 5, 6 are evaluable, giving (1, 1, 3, 3)', () => {
  const p = prepare({ data: toyData([1, 4, 7], [2, 5, 6, 8], [3]), settings: defaultSettings() });
  const m = outcomeMasks(p, 1, 2, 1.0);
  const c = exposedCounts(p, 0, m);
  assert.deepEqual([c.k, c.n, m.K, m.N], [1, 1, 3, 3], 'counts');
});

// The low-completeness start days must be the same days Q1 counts (core/quality.js).
test('prepare: low-completeness start days equal buildQuality().lowCompletenessDays on the synthetic sample', () => {
  const data = generateWide(statsSynth, statsSynth.seed);
  const settings = defaultSettings();
  const p = prepare({ data, settings });
  let count = 0;
  for (let t = 0; t < p.n; t += 1) count += p.lowComp[t];
  const q = buildQuality(data, settings, { completeness: settingsConfig.completeness, diversity: timeDiversity });
  assert.equal(count, q.lowCompletenessDays, 'same count');
});
