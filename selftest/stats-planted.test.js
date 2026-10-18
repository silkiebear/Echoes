// Planted-effect tests on the synthetic wide sample (default config). Ranges are the 3-standard-deviation analytic
// limits written before any run; they are not edited after a measurement. Plant label ids: 0/1 up, 2/3 down, 4/5 late,
// 6/7 streaks A and B, 8 onward fillers.
import { test, assert, skip } from '../core/harness.js';
import { runScan } from '../core/stats/run.js';
import { prepare } from '../core/stats/prepare.js';
import { outcomeMasks, exposedCounts } from '../core/stats/cell-counts.js';
import { placeboForCell, placeboBand } from '../core/stats/placebo-run.js';
import { timeSplitFails } from '../core/stats/timesplit.js';
import { rateStats } from '../core/stats/rate.js';
import { fisherTwoSided } from '../core/stats/exact.js';
import { scanCells } from '../core/stats/scan.js';
import { bhAdjust } from '../core/stats/fdr.js';
import { mulberry32 } from '../core/synth.js';
import { generateWide } from '../core/synth-wide.js';
import { defaultSettings } from '../core/settings.js';
import { statsSynth } from '../config/stats-synth.js';
import { stats } from '../config/stats.js';
import { windows } from '../config/windows.js';
import { generateDrift } from '../core/synth-drift.js';
import { statsDrift } from '../config/stats-drift.js';

const UP_X = 0;
const UP_Y = 1;
const DOWN_X = 2;
const DOWN_Y = 3;
const LATE_X = 4;
const LATE_Y = 5;
const STREAK_A = 6;
const STREAK_B = 7;
const FILLER_FIRST = 8;
const ALPHA = 0.05;
const SEEDS_P6 = 40;
const SEEDS_P7 = 20;
const FILLERS_P6 = 20;
const LAG_BAND_FIRST = 1;
const LAG_BAND_CHECK = 10;
const G1_SMOKE_SEEDS = 2;
// Same limit as the G1 share in stats-null.test.js (phase 4b, derivation there).
const G1_SHARE_MAX = 0.08;

// Tests that loop over many seeds run in Node only (phase 4c.0.4): the browser self-test has a time budget. Limits are
// unchanged; the browser keeps a 2-seed smoke of the same null calibration.
const nodeOnly = (name, fn) => {
  if (typeof window === 'undefined') test(name, fn);
  else skip(name, 'Node only');
};

let cachedScan = null;
function defaultScan() {
  if (!cachedScan) {
    const data = generateWide(statsSynth, statsSynth.seed);
    cachedScan = runScan({ data, settings: defaultSettings() }, { mode: 'fast' }, {});
  }
  return cachedScan;
}

function rowOf(result, exposure, outcome, window) {
  return result.rows.find((r) => r.exposure === exposure && r.outcome === outcome && r.window === window);
}

test('P1 up plant at 1 day: rate ratio 2.3 to 4.0, difference 0.29 to 0.51, q below 1e-6, up', async () => {
  const r = rowOf(await defaultScan(), UP_X, UP_Y, '1d');
  assert.ok(r, 'row present');
  assert.ok(r.rr >= 2.3 && r.rr <= 4.0, `rr ${r.rr}`);
  assert.ok(r.diff >= 0.29 && r.diff <= 0.51, `diff ${r.diff}`);
  assert.ok(r.q !== null && r.q < 1e-6, `q ${r.q}`);
  assert.ok(r.rr > 1, 'direction up');
});

test('P1 up plant at 3 days: rate ratio 1.3 to 1.8, difference 0.18 to 0.33', async () => {
  const r = rowOf(await defaultScan(), UP_X, UP_Y, '3d');
  assert.ok(r, 'row present');
  assert.ok(r.rr >= 1.3 && r.rr <= 1.8, `rr ${r.rr}`);
  assert.ok(r.diff >= 0.18 && r.diff <= 0.33, `diff ${r.diff}`);
});

test('P2 down plant at 1 day: rate ratio 0.00 to 0.30, difference -0.18 to -0.09, q below 1e-6', async () => {
  const r = rowOf(await defaultScan(), DOWN_X, DOWN_Y, '1d');
  assert.ok(r, 'row present');
  assert.ok(r.rr >= 0 && r.rr <= 0.30, `rr ${r.rr}`);
  assert.ok(r.diff >= -0.18 && r.diff <= -0.09, `diff ${r.diff}`);
  assert.ok(r.q !== null && r.q < 1e-6, `q ${r.q}`);
});

test('P3 the top row by q is an up or down plant pair; no streak or filler pair ranks above it', async () => {
  const top = (await defaultScan()).rows[0];
  const pairs = [[UP_X, UP_Y], [DOWN_X, DOWN_Y]];
  assert.ok(pairs.some(([x, y]) => top.exposure === x && top.outcome === y), `top row is ${top.exposure} to ${top.outcome}`);
});

// P3 at scale (phase 4b, tier 4b.3; Node only). Derivation, written before the run: planted q is about 1e-44 for the
// up pair and 1e-14 for the down pair at 1 day; a null cell cannot reach p below about 1e-7 among about 3 million tests.
// So the up pair must be row 1 by q, and the down pair must be within the first 40 rows. The real positions are printed.
if (typeof window === 'undefined') {
  test('P3 at 900 fillers (Node): the up pair at 1 day is row 1 by q; the down pair at 1 day is within the first 40 rows', async () => {
    const data = generateWide(statsSynth, statsSynth.seed, statsSynth.fillerCountLarge);
    const result = await runScan({ data, settings: defaultSettings() }, { mode: 'fast' }, {});
    const position = (x, y) => result.rows.findIndex((r) => r.exposure === x && r.outcome === y && r.window === '1d') + 1;
    const upPos = position(UP_X, UP_Y);
    const downPos = position(DOWN_X, DOWN_Y);
    console.log(`P3 900 fillers: up pair at 1 day row ${upPos}; down pair at 1 day row ${downPos}`);
    assert.ok(upPos === 1, `up pair row ${upPos}`);
    assert.ok(downPos >= 1 && downPos <= 40, `down pair row ${downPos}`);
  });
} else {
  skip('P3 at 900 fillers (Node): the up pair at 1 day is row 1 by q; the down pair at 1 day is within the first 40 rows', 'Node only');
}

// Null calibration. Amended by the user (phase 3, M1) after the measurement in notes\phase3.md section 9: the original
// rule (filler q count at most 5) assumed uniform null p-values and measured 9 at the default seed.
// Derivation, written before the amended run: filler pairs are the only true nulls here. BH bounds the expected share
// of false discoveries by alpha under independence or positive dependence, so the mean over seeds of (filler
// discoveries / all discoveries) should stay at or below 0.05. Caveat, not checked: streak-to-filler cells are nulls
// too, but this rule counts only filler pairs. The sensitivity line prints the share with every non-plant cell counted.
const P4_SHARE_MAX = 0.08;
const fillerPair = (c) => c.e >= FILLER_FIRST && c.o >= FILLER_FIRST;
const PLANTED_PAIRS = [[UP_X, UP_Y], [DOWN_X, DOWN_Y], [LATE_X, LATE_Y]];
const isPlantedPair = (c) => PLANTED_PAIRS.some(([x, y]) => c.e === x && c.o === y);

// Every tested cell gets its p (not only the kept ones), and q comes from the full family.
async function nullCells(seed) {
  const data = generateWide(statsSynth, seed);
  const p = prepare({ data, settings: defaultSettings() });
  const cells = [];
  await scanCells(p, { ...stats, windows }, { onCell: (c) => cells.push(c) });
  const qs = bhAdjust(cells.map((c) => c.p), cells.length);
  return cells.map((c, i) => ({ c, q: qs[i] }));
}

test('P4 null calibration (a): default seed filler pairs with p below 0.05 at most 8 percent', async () => {
  const first = await nullCells(statsSynth.seed);
  const filler = first.filter(({ c }) => fillerPair(c));
  const pShare = filler.filter(({ c }) => c.p < ALPHA).length / filler.length;
  console.log(`P4 (a) filler pair share with p below 0.05: ${pShare.toFixed(4)}`);
  assert.ok(pShare <= P4_SHARE_MAX, `share ${pShare}`);
});

// G6 (phase 4b, tier 4b.3; replaces the amended P4 (b)). Limits and derivation, written before the first run:
// for 10 seeds (statsSynth.seed + i, 300 fillers, the default scan), a discovery (BH q below alpha over every tested
// cell) is TRUE only when it is a planted pair in the planted direction (up, down or late, any window); every other
// discovery is FALSE. Seeds without discoveries are skipped and counted. Assert: the mean over seeds of
// (false / all discoveries) is at most 0.10. Derivation: BH at alpha 0.05 gives an expected false share of about 0.05
// for independent tests; 0.10 allows for dependence between cells that share a label.
const G6_SEEDS = 10;
const G6_MEAN_MAX = 0.10;
nodeOnly('G6 false share of discoveries on the wide sample: mean over 10 seeds at most 10 percent', async () => {
  const perSeed = [];
  for (let i = 0; i < G6_SEEDS; i += 1) {
    const cells = await nullCells(statsSynth.seed + i);
    const disc = cells.filter(({ q }) => q < ALPHA);
    perSeed.push({ all: disc.length, falseCount: disc.filter(({ c }) => !isPlantedPair(c)).length });
  }
  const used = perSeed.filter((s) => s.all > 0);
  const mean = used.reduce((sum, s) => sum + s.falseCount / s.all, 0) / used.length;
  console.log(`G6 all discoveries per seed: ${perSeed.map((s) => s.all).join(', ')}`);
  console.log(`G6 false discoveries per seed: ${perSeed.map((s) => s.falseCount).join(', ')}`);
  console.log(`G6 seeds skipped (no discoveries): ${G6_SEEDS - used.length}; mean false share ${mean.toFixed(4)}`);
  assert.ok(used.length > 0, 'no seed with discoveries');
  assert.ok(mean <= G6_MEAN_MAX, `mean false share ${mean}`);
});

// Browser smoke (phase 4c.0.4): two drift seeds, the G1 share limit only. Runs in Node too; the 20-seed gate is in
// stats-null.test.js.
test('G1 drift null smoke (2 seeds): p below 0.05 on at most 8 percent of tested cells', async () => {
  let tested = 0;
  let below = 0;
  for (let i = 0; i < G1_SMOKE_SEEDS; i += 1) {
    const data = generateDrift(statsDrift, statsDrift.seed + i, statsDrift.fillerCount);
    const ps = [];
    await runScan({ data, settings: defaultSettings() }, { mode: 'fast', cfg: { ...stats, scanTest: 'stratified' } }, { onCell: (c) => ps.push(c.p) });
    tested += ps.length;
    below += ps.filter((p) => p < ALPHA).length;
  }
  const share = below / tested;
  console.log(`G1 smoke (2 seeds): p below 0.05 on ${below} of ${tested} tested cells (${share.toFixed(4)})`);
  assert.ok(tested > 0, 'no cell tested');
  assert.ok(share <= G1_SHARE_MAX, `share ${share}`);
});

test('P5 shift placebo for up X to up Y at 1 day with fast shuffles: placeboP at most 0.01', async () => {
  const r = rowOf(await defaultScan(), UP_X, UP_Y, '1d');
  assert.ok(r && r.placeboP !== null, 'placebo computed');
  assert.ok(r.placeboP <= 0.01, `placeboP ${r.placeboP}`);
});

// Autocorrelation trap: streak series are long runs, so the independence (exact) test over-rejects.
// G2 (phase 4b, tier 4b.3; replaces "analytic above placebo"). Limit and derivation, written before the first run:
// Streak A and Streak B share no effect, so a valid test rejects at the nominal 0.05. Over 40 seeds P(7 or more
// rejections) = 0.0034 at 0.05, so the limit 0.15 (at most 6 of 40) has a false-fail rate of about 0.3 percent under a
// valid test. The stratified test (with the autocorrelation inflation) must meet it; the phase 3 Fisher rate (0.625)
// is printed for comparison only. The cell is taken from the full scan; an untested cell counts as no rejection.
nodeOnly('P6 streak pair at 1 week over 40 seeds: placebo rejects at most 15 percent; the stratified test rejects at most 15 percent', async () => {
  let placeboRejects = 0;
  let stratRejects = 0;
  let fisherRejects = 0;
  const w1 = windows.findIndex((w) => w.id === '1w');
  for (let i = 0; i < SEEDS_P6; i += 1) {
    const seed = stats.placebo.seed + i;
    const data = generateWide(statsSynth, statsSynth.seed + i, FILLERS_P6);
    const p = prepare({ data, settings: defaultSettings() });
    const m = outcomeMasks(p, STREAK_B, 7, stats.minWindowCoverage);
    const c = exposedCounts(p, STREAK_A, m);
    const rr = rateStats(c.k, c.n, m.K, m.N).rr;
    const pv = fisherTwoSided(c.k, c.n, m.K, m.N);
    const plc = placeboForCell(p, STREAK_A, m, rr, stats.placebo.shuffles.fast, mulberry32(seed), stats.placebo.minShiftDays);
    const cells = [];
    await scanCells(p, { ...stats, windows }, { onCell: (cell) => cells.push(cell) });
    const cell = cells.find((x) => x.e === STREAK_A && x.o === STREAK_B && x.wi === w1);
    if (plc.placeboP !== null && plc.placeboP < ALPHA) placeboRejects += 1;
    if (cell && cell.p < ALPHA) stratRejects += 1;
    if (pv < ALPHA) fisherRejects += 1;
  }
  const placeboRate = placeboRejects / SEEDS_P6;
  const stratRate = stratRejects / SEEDS_P6;
  console.log(`P6 placebo rejection ${placeboRate} (${placeboRejects} of ${SEEDS_P6}); stratified rejection ${stratRate} (${stratRejects}); fisher rejection ${fisherRejects / SEEDS_P6} (${fisherRejects})`);
  assert.ok(placeboRate <= 0.15, `placebo rate ${placeboRate}`);
  assert.ok(stratRate <= 0.15, `stratified rate ${stratRate}`);
});

nodeOnly('P7 late plant at 1 day: time split fails on at least 85 percent of 20 seeds', () => {
  let fails = 0;
  for (let i = 0; i < SEEDS_P7; i += 1) {
    const data = generateWide(statsSynth, statsSynth.seed + i);
    const p = prepare({ data, settings: defaultSettings() });
    const m = outcomeMasks(p, LATE_Y, 1, stats.minWindowCoverage);
    const c = exposedCounts(p, LATE_X, m);
    const rr = rateStats(c.k, c.n, m.K, m.N).rr;
    if (timeSplitFails(p, LATE_X, m, rr, stats)) fails += 1;
  }
  const share = fails / SEEDS_P7;
  console.log(`P7 late plant time split fails on ${fails} of ${SEEDS_P7} seeds (${share})`);
  assert.ok(share >= 0.85, `share ${share}`);
});

test('P8 placebo band for up X to up Y: observed above the band at lag 1, inside it at lag 10', () => {
  const data = generateWide(statsSynth, statsSynth.seed);
  const p = prepare({ data, settings: defaultSettings() });
  const band = placeboBand(p, UP_X, UP_Y, stats.placebo.maxLag, stats.placebo.shuffles.fast, mulberry32(stats.placebo.seed), stats);
  const at = (lag) => band.find((b) => b.lag === lag);
  const first = at(LAG_BAND_FIRST);
  const check = at(LAG_BAND_CHECK);
  console.log(`P8 lag ${LAG_BAND_FIRST}: rate ${first.rate}, lo ${first.lo}, hi ${first.hi}; lag ${LAG_BAND_CHECK}: rate ${check.rate}, lo ${check.lo}, hi ${check.hi}`);
  assert.ok(first.rate > first.hi, `lag 1 rate ${first.rate} above hi ${first.hi}`);
  assert.ok(check.rate >= check.lo && check.rate <= check.hi, `lag 10 rate ${check.rate} inside [${check.lo}, ${check.hi}]`);
});
