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

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const TOL = 1e-12;

function expectNear(actual, expected, msg) {
  assert.ok(near(actual, expected, TOL), `${msg}: expected ${expected}, got ${actual}`);
}

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

test('toy 1 through scanCells: the same cell is tested with the same counts', async () => {
  const p = prepare({ data: toyData([1, 4, 7], [2, 3, 5, 8]), settings: defaultSettings() });
  const cfg = { ...stats, windows: [{ id: 'w2', days: 2 }], minExposed: 1 };
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
