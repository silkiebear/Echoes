// Null gates on the synthetic drift sample (phase 4b, tier 4b.3, G1 and G5; Node only). Every cell is null by construction,
// so a valid test gives uniform p-values. Limits and derivations below were written before the first run and are not
// edited after a measurement.
import { test, assert, skip } from '../core/harness.js';
import { runScan } from '../core/stats/run.js';
import { generateDrift } from '../core/synth-drift.js';
import { defaultSettings } from '../core/settings.js';
import { statsDrift } from '../config/stats-drift.js';
import { stats } from '../config/stats.js';
import { generateShared } from '../core/synth-shared.js';
import { plantPair, powerLabelIds } from '../core/synth-power.js';
import { statsShared } from '../config/stats-shared.js';
import { statsPower } from '../config/stats-power.js';
import { windows } from '../config/windows.js';

const ALPHA = 0.05;
const G1_SEEDS = 20;
// G1 A: at most 3 seeds with a discovery. Derivation: BH at alpha 0.05 keeps the chance of any discovery under a
// complete null at or below 0.05 per seed. With 20 independent seeds, P(4 or more seeds with a discovery) = 0.0158
// (binomial, n 20, p 0.05), so the limit 3 has a false-fail rate of about 1.6 percent.
const G1_SEEDS_MAX = 3;
// G1 B: share of tested cells with p below 0.05, all seeds pooled, at most 0.08. Derivation: a valid p-value gives 0.05;
// the phase 3 P4 limit was the same 0.08 (Fisher alone gave 0.025 on the filler pairs).
const G1_SHARE_MAX = 0.08;

// Gates for the logging-volume strata (phase 4d, option B; Node only). Limits and derivations were written BEFORE the
// first run (phase 4d, section 9). Seeds: statsShared.seed + i (G7, G7b) and statsPower.seed + i (G9), 40 seeds.
// G7: p0 = the per-seed false-alarm rate of the no-factor config in 4d.1 (2 of 40 = 0.05, floored at 0.05). The limit k is
// the smallest value with P(X > k) below 0.02 for X binomial(40, 0.05): P(X > 4) = 0.0424, P(X > 5) = 0.0139, so k = 5.
// Rate limit: three times the 4d.1 no-factor rate, 3 x (3 / 326,463) x 100,000 = 2.76 per 100,000 tested cells.
// G7b: the same limits for the half-label factor. G9: rate ratio 3 has baseline detection 40 of 40 (4d.1); the limit is the
// baseline minus 0.10 = 36 of 40. Rate ratio 2 has baseline 6 of 40 (0.15), so its limit minus 0.15 is 0: no constraint.
const G7_SEEDS = 40;
const G7_SEEDS_MAX = 5;
const G7_RATE_MAX = 2.76;
const G9_RR3_MIN = 36;
const G9_SEEDS = 40;
const DOSE_FILLERS = 60;

function withLow(low) {
  return { ...statsShared, levels: { ...statsShared.levels, low } };
}

const VOLUME_CFG = { ...stats, scanTest: 'stratified', strata: { ...stats.strata, mode: 'volume' } };

async function falseAlarmRun(sharedCfg, mode) {
  let seedsWith = 0;
  let tested = 0;
  let discoveries = 0;
  for (let i = 0; i < G7_SEEDS; i += 1) {
    const data = generateShared(sharedCfg, statsDrift, statsShared.seed + i, mode, DOSE_FILLERS);
    const result = await runScan({ data, settings: defaultSettings() }, { mode: 'fast', cfg: VOLUME_CFG });
    if (result.meta.discoveries > 0) seedsWith += 1;
    tested += result.meta.cellsTested;
    discoveries += result.meta.discoveries;
  }
  return { seedsWith, rate: (discoveries / tested) * 100000 };
}

async function detectionRun(rateRatio) {
  const pGiven = rateRatio * statsPower.pBase;
  const cfg = { pExposure: statsPower.pExposure, pBase: statsPower.pBase, pGiven, lag: statsPower.lag };
  const oneDay = windows.find((w) => w.days === 1).id;
  let detected = 0;
  for (let i = 0; i < G9_SEEDS; i += 1) {
    const seed = statsPower.seed + i;
    const data = plantPair(generateDrift(statsDrift, seed, DOSE_FILLERS), cfg, seed);
    const { exposure, outcome } = powerLabelIds(data);
    const result = await runScan({ data, settings: defaultSettings() }, { mode: 'fast', cfg: VOLUME_CFG });
    const row = result.rows.find((r) => r.exposure === exposure && r.outcome === outcome && r.window === oneDay);
    if (row && row.q !== null && row.q < stats.alpha) detected += 1;
  }
  return detected;
}

// Decision A (phase 4d): the option-B gates are not run. They stay, unchanged, for a later fix (phase4d.md section 7).
const OPTION_B_GATES = false;

if (typeof window === 'undefined' && !OPTION_B_GATES) {
  skip('option-B gates G7, G7b and G9: not run (decision A, phase 4d section 7)', 'decision A');
}

if (typeof window === 'undefined' && OPTION_B_GATES) {
  for (const [name, cfg, mode] of [
    ['shared-0.25', withLow(0.25), 'shared'],
    ['shared-0.5', statsShared, 'shared'],
  ]) {
    test(`G7 (option B) ${name}: at most ${G7_SEEDS_MAX} of 40 seeds with a false alarm; at most ${G7_RATE_MAX} per 100,000 cells`, async () => {
      const r = await falseAlarmRun(cfg, mode);
      assert.ok(r.seedsWith <= G7_SEEDS_MAX, `${name}: ${r.seedsWith} seeds with a false alarm`);
      assert.ok(r.rate <= G7_RATE_MAX, `${name}: ${r.rate.toFixed(2)} per 100,000`);
    });
  }

  test(`G7b (option B) shared-half-0.25 (acts on half the labels): at most ${G7_SEEDS_MAX} of 40 seeds; at most ${G7_RATE_MAX} per 100,000`, async () => {
    const r = await falseAlarmRun(withLow(0.25), 'shared-half');
    assert.ok(r.seedsWith <= G7_SEEDS_MAX, `shared-half: ${r.seedsWith} seeds with a false alarm`);
    assert.ok(r.rate <= G7_RATE_MAX, `shared-half: ${r.rate.toFixed(2)} per 100,000`);
  });

  test(`G9 (option B) rate ratio 3 is detected in at least ${G9_RR3_MIN} of 40 seeds (rate ratio 2 and 1.5 are reported, not gated)`, async () => {
    const detected = await detectionRun(3);
    assert.ok(detected >= G9_RR3_MIN, `rate ratio 3: detected in ${detected} of ${G9_SEEDS}`);
  });
}

async function driftRun(seed, scanTest) {
  const data = generateDrift(statsDrift, seed, statsDrift.fillerCount);
  const ps = [];
  const result = await runScan(
    { data, settings: defaultSettings() },
    { mode: 'fast', cfg: { ...stats, scanTest } },
    { onCell: (c) => ps.push(c.p) },
  );
  return { discoveries: result.meta.discoveries, tested: ps.length, below: ps.filter((p) => p < ALPHA).length };
}

if (typeof window === 'undefined') {
  test('G1 drift null (stratified): at most 3 of 20 seeds with a discovery; p below 0.05 on at most 8 percent of tested cells', async () => {
    let seedsWith = 0;
    let tested = 0;
    let below = 0;
    const perSeed = [];
    for (let i = 0; i < G1_SEEDS; i += 1) {
      const r = await driftRun(statsDrift.seed + i, 'stratified');
      perSeed.push(r.discoveries);
      if (r.discoveries > 0) seedsWith += 1;
      tested += r.tested;
      below += r.below;
    }
    const share = below / tested;
    console.log(`G1 discoveries per seed: ${perSeed.join(', ')}`);
    console.log(`G1 seeds with a discovery: ${seedsWith} of ${G1_SEEDS}; p below 0.05 on ${below} of ${tested} tested cells (${share.toFixed(4)})`);
    assert.ok(seedsWith <= G1_SEEDS_MAX, `seeds with a discovery ${seedsWith}`);
    assert.ok(share <= G1_SHARE_MAX, `share ${share}`);
  });

  // G5 (report only): the same seeds with the phase 3 pooled exact test. Compare with the 4b.1.4 baseline: 20 of 20
  // seeds, mean 1875.75 discoveries; they must be identical (the fisher path is the phase 3 code).
  test('G5 drift null (fisher, report only): seeds with a discovery and mean discoveries', async () => {
    let seedsWith = 0;
    let total = 0;
    for (let i = 0; i < G1_SEEDS; i += 1) {
      const r = await driftRun(statsDrift.seed + i, 'fisher');
      if (r.discoveries > 0) seedsWith += 1;
      total += r.discoveries;
    }
    console.log(`G5 fisher: seeds with a discovery ${seedsWith} of ${G1_SEEDS}; mean discoveries ${(total / G1_SEEDS).toFixed(2)}`);
    assert.ok(true, 'report only');
  });
} else {
  skip('G1 drift null (stratified): at most 3 of 20 seeds with a discovery; p below 0.05 on at most 8 percent of tested cells', 'Node only');
  skip('G5 drift null (fisher, report only): seeds with a discovery and mean discoveries', 'Node only');
}
