// Synthetic drift null (phase 4b, tier 4b.1). Generator: core/synth-drift.js. Everything here is invented.
// Every label is null by construction (no label affects another), but labels are non-stationary: each is present
// only inside its own active period, and the rates drift or the days are autocorrelated. A test that assumes a
// constant rate over independent days can see associations here, so this set measures that.
export const statsDrift = {
  days: 1100, // same length as statsSynth
  startDate: '2022-01-01', // UTC, same as statsSynth
  fillerCount: 60, // labels in one run (tests and gates)
  seed: 20261017, // base seed; the gates use statsDrift.seed + i
  // A label is active for at least this share of the days (its length is drawn between this and the rest of the period).
  activeMinFraction: 0.3,
  // A label becomes active no later than this share of the days; the start day is uniform below it.
  // Must satisfy startMaxFraction + activeMinFraction <= 1 (the generator checks).
  startMaxFraction: 0.7,
  // Long-run daily rate, log-uniform in this range (drawn once per label).
  baseRate: { min: 0.05, max: 0.5 },
  // Trend labels: the rate is base * (1 + trend * elapsed / length), so trend is the change across the active period.
  trend: { min: -0.8, max: 0.8 },
  // Share of labels that are streak labels (two-state chains, autocorrelated); the rest are trend labels.
  streakShare: 0.5,
  // Streak labels: P(present | present yesterday). pStart is derived from it so the long-run rate equals the base rate.
  pStay: 0.9,
  // Trend labels: the daily rate is clamped to this range so the Bernoulli rate stays valid.
  minRate: 0.02,
  maxRate: 0.95,
};
