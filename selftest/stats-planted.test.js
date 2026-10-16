// Planted-effect tests on the synthetic wide sample (default config). Ranges are the 3-standard-deviation analytic
// limits written before any run; they are not edited after a measurement. Plant label ids: 0/1 up, 2/3 down, 4/5 late,
// 6/7 streaks A and B, 8 onward fillers.
import { test, assert } from '../core/harness.js';
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

// Null calibration. Amended by the user (phase 3, M1) after the measurement in notes\phase3.md section 9: the original
// rule (filler q count at most 5) assumed uniform null p-values and measured 9 at the default seed.
// Derivation, written before the amended run: filler pairs are the only true nulls here. BH bounds the expected share
// of false discoveries by alpha under independence or positive dependence, so the mean over seeds of (filler
// discoveries / all discoveries) should stay at or below 0.05. Caveat, not checked: streak-to-filler cells are nulls
// too, but this rule counts only filler pairs. The sensitivity line prints the share with every non-plant cell counted.
const P4_SEEDS = 10;
const P4_MEAN_MAX = 0.05;
const P4_SHARE_MAX = 0.08;
const fillerPair = (c) => c.e >= FILLER_FIRST && c.o >= FILLER_FIRST;
const isPlant = (id) => id <= LATE_Y;

// Every tested cell gets its p (not only the kept ones), and q comes from the full family.
async function nullCells(seed) {
  const data = generateWide(statsSynth, seed);
  const p = prepare({ data, settings: defaultSettings() });
  const cells = [];
  await scanCells(p, { ...stats, windows }, { onCell: (c) => cells.push(c) });
  const qs = bhAdjust(cells.map((c) => c.p), cells.length);
  return cells.map((c, i) => ({ c, q: qs[i] }));
}

test('P4 null calibration: default seed filler pairs with p below 0.05 at most 8 percent; mean over 10 seeds of the filler share of discoveries at most 5 percent', async () => {
  const first = await nullCells(statsSynth.seed);
  const filler = first.filter(({ c }) => fillerPair(c));
  const pShare = filler.filter(({ c }) => c.p < ALPHA).length / filler.length;
  assert.ok(pShare <= P4_SHARE_MAX, `share ${pShare}`);
  const perSeed = [];
  for (let i = 0; i < P4_SEEDS; i += 1) {
    const cells = i === 0 ? first : await nullCells(statsSynth.seed + i);
    const disc = cells.filter(({ q }) => q < ALPHA);
    perSeed.push({
      fillerDisc: disc.filter(({ c }) => fillerPair(c)).length,
      all: disc.length,
      nonPlantDisc: disc.filter(({ c }) => !isPlant(c.e) && !isPlant(c.o)).length,
    });
  }
  const used = perSeed.filter((s) => s.all > 0);
  const mean = used.reduce((sum, s) => sum + s.fillerDisc / s.all, 0) / used.length;
  const sensitivity = used.reduce((sum, s) => sum + s.nonPlantDisc / s.all, 0) / used.length;
  console.log(`P4 filler discoveries per seed: ${perSeed.map((s) => s.fillerDisc).join(', ')}`);
  console.log(`P4 all discoveries per seed: ${perSeed.map((s) => s.all).join(', ')}`);
  console.log(`P4 seeds skipped (no discoveries): ${P4_SEEDS - used.length}; mean filler share ${mean.toFixed(4)}`);
  console.log(`P4 sensitivity (not asserted): mean share with every non-plant cell counted ${sensitivity.toFixed(4)}`);
  assert.ok(used.length > 0, 'no seed with discoveries');
  assert.ok(mean <= P4_MEAN_MAX, `mean filler share ${mean}`);
});

test('P5 shift placebo for up X to up Y at 1 day with fast shuffles: placeboP at most 0.01', async () => {
  const r = rowOf(await defaultScan(), UP_X, UP_Y, '1d');
  assert.ok(r && r.placeboP !== null, 'placebo computed');
  assert.ok(r.placeboP <= 0.01, `placeboP ${r.placeboP}`);
});

// Autocorrelation trap: streak series are long runs, so the independence (exact) test over-rejects.
test('P6 streak pair at 1 week over 40 seeds: placebo rejects at most 15 percent, analytic rejects more', () => {
  let placeboRejects = 0;
  let analyticRejects = 0;
  for (let i = 0; i < SEEDS_P6; i += 1) {
    const seed = stats.placebo.seed + i;
    const data = generateWide(statsSynth, statsSynth.seed + i, FILLERS_P6);
    const p = prepare({ data, settings: defaultSettings() });
    const m = outcomeMasks(p, STREAK_B, 7, stats.minWindowCoverage);
    const c = exposedCounts(p, STREAK_A, m);
    const rr = rateStats(c.k, c.n, m.K, m.N).rr;
    const pv = fisherTwoSided(c.k, c.n, m.K, m.N);
    const plc = placeboForCell(p, STREAK_A, m, rr, stats.placebo.shuffles.fast, mulberry32(seed), stats.placebo.minShiftDays);
    if (plc.placeboP !== null && plc.placeboP < ALPHA) placeboRejects += 1;
    if (pv < ALPHA) analyticRejects += 1;
  }
  const placeboRate = placeboRejects / SEEDS_P6;
  const analyticRate = analyticRejects / SEEDS_P6;
  console.log(`P6 placebo rejection ${placeboRate} (${placeboRejects} of ${SEEDS_P6}), analytic rejection ${analyticRate} (${analyticRejects})`);
  assert.ok(placeboRate <= 0.15, `placebo rate ${placeboRate}`);
  assert.ok(analyticRate > placeboRate, `analytic ${analyticRate} not above placebo ${placeboRate}`);
});

test('P7 late plant at 1 day: time split fails on at least 85 percent of 20 seeds', () => {
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
