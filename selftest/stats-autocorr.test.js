// Long-run labels (lag-1 correlation of daily presence) and the split of discoveries that uses them (3.2c decision).
import { test, assert } from '../core/harness.js';
import { lagOneCorrelation, prepare } from '../core/stats/prepare.js';
import { runScan } from '../core/stats/run.js';
import { generateWide } from '../core/synth-wide.js';
import { defaultSettings } from '../core/settings.js';
import { statsSynth } from '../config/stats-synth.js';
import { stats } from '../config/stats.js';

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const TOL = 1e-12;
const UP_X = 0;
const UP_Y = 1;
const DOWN_X = 2;
const DOWN_Y = 3;
const STREAK_A = 6;
const STREAK_B = 7;

test('lagOneCorrelation: [1,1,1,0,0,0,1,1] gives phi 5/12 from the pair table (3, 1, 1, 2)', () => {
  const flags = Uint8Array.from([1, 1, 1, 0, 0, 0, 1, 1]);
  const observed = new Uint8Array(flags.length).fill(1);
  assert.ok(near(lagOneCorrelation(flags, observed), 5 / 12, TOL), 'phi');
});

test('lagOneCorrelation: a constant label and an empty label give 0', () => {
  const observed = new Uint8Array(6).fill(1);
  assert.equal(lagOneCorrelation(new Uint8Array(6).fill(1), observed), 0, 'constant present');
  assert.equal(lagOneCorrelation(new Uint8Array(6), observed), 0, 'never present');
});

// Pairs that touch day 2 (unobserved) are skipped: the kept pairs are (1,1), (1,0) and (0,0), phi 1/2.
// Counting them would give -1/6, so the test separates the two.
test('lagOneCorrelation skips pairs with an unobserved day', () => {
  const flags = Uint8Array.from([1, 1, 0, 1, 0, 0]);
  const observed = Uint8Array.from([1, 1, 0, 1, 1, 1]);
  assert.ok(near(lagOneCorrelation(flags, observed), 1 / 2, TOL), 'phi');
});

test('synthetic sample: streak labels are long-run, planted pairs and fillers are not', () => {
  const p = prepare({ data: generateWide(statsSynth, statsSynth.seed), settings: defaultSettings() });
  for (const id of [STREAK_A, STREAK_B]) {
    assert.ok(p.lagOne[id] >= stats.autocorr.threshold, `streak ${id} at ${p.lagOne[id]}`);
  }
  for (let id = 0; id < p.labelCount; id += 1) {
    if (id === STREAK_A || id === STREAK_B) continue;
    assert.ok(p.lagOne[id] < stats.autocorr.threshold, `label ${id} at ${p.lagOne[id]}`);
  }
});

test('run: discoveries split into long-run and other; planted pairs are not long-run rows', async () => {
  const result = await runScan({ data: generateWide(statsSynth, statsSynth.seed), settings: defaultSettings() }, { mode: 'fast' }, {});
  const { discoveries, discoveriesLongRuns } = result.meta;
  assert.ok(discoveries > 0 && discoveriesLongRuns <= discoveries, 'counts');
  const rowOf = (x, y) => result.rows.find((r) => r.exposure === x && r.outcome === y && r.window === '1d');
  assert.equal(rowOf(UP_X, UP_Y).longRuns, false, 'up pair');
  assert.equal(rowOf(DOWN_X, DOWN_Y).longRuns, false, 'down pair');
  const streakRows = result.rows.filter((r) => r.exposure === STREAK_A || r.exposure === STREAK_B);
  assert.ok(streakRows.length > 0, 'streak rows exist');
  assert.ok(streakRows.every((r) => r.longRuns === true), 'every streak exposure row is long-run');
});
