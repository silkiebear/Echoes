// Power measurement (phase 4d, tier 4d.1.4; report only). A planted pair of labels 'Power X' and 'Power Y' is added to the
// drift null (core\synth-power.js). Generator: core\synth-drift.js. Everything here is invented; nothing describes the
// user's export. Derivation of the expected values is in notes\phase4d.md section 7 (written before the run).
export const statsPower = {
  // Base seed of the measurement (run i uses seed + i). It is not the drift seed (statsDrift.seed).
  seed: 20261019,
  // Share of days on which the exposure label 'Power X' is present. Independent from day to day.
  pExposure: 0.20,
  // Share of days on which 'Power Y' is present when the exposure was not present at the lag (the base rate).
  pBase: 0.10,
  // Days between the exposure and the outcome. The scan's 1-day window reads the day after the exposure, so lag 1.
  lag: 1,
  // Rate ratios measured: the outcome probability after the exposure is rateRatio x pBase (0.15, 0.20, 0.30).
  rateRatios: [1.5, 2, 3],
};
