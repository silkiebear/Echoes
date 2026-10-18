// Null gates on the synthetic drift sample (phase 4b, tier 4b.3, G1 and G5; Node only). Every cell is null by construction,
// so a valid test gives uniform p-values. Limits and derivations below were written before the first run and are not
// edited after a measurement.
import { test, assert, skip } from '../core/harness.js';
import { runScan } from '../core/stats/run.js';
import { generateDrift } from '../core/synth-drift.js';
import { defaultSettings } from '../core/settings.js';
import { statsDrift } from '../config/stats-drift.js';
import { stats } from '../config/stats.js';

const ALPHA = 0.05;
const G1_SEEDS = 20;
// G1 A: at most 3 seeds with a discovery. Derivation: BH at alpha 0.05 keeps the chance of any discovery under a
// complete null at or below 0.05 per seed. With 20 independent seeds, P(4 or more seeds with a discovery) = 0.0158
// (binomial, n 20, p 0.05), so the limit 3 has a false-fail rate of about 1.6 percent.
const G1_SEEDS_MAX = 3;
// G1 B: share of tested cells with p below 0.05, all seeds pooled, at most 0.08. Derivation: a valid p-value gives 0.05;
// the phase 3 P4 limit was the same 0.08 (Fisher alone gave 0.025 on the filler pairs).
const G1_SHARE_MAX = 0.08;

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
