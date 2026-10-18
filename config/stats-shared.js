// Synthetic shared logging factor and weekly cycle for the drift null (phase 4c, tier 4c.1; report only). Used by
// core\synth-shared.js and tools\measure-null.mjs. Everything here is invented; nothing describes the user's export.
// Derivation for the level chain, written before the first measurement: a symmetric two-state chain with stay
// probability 0.9 spends half of its days in each state; its mean run length is 1 / (1 - 0.9) = 10 days; the mean level
// is (1 + 0.5) / 2 = 0.75.
export const statsShared = {
  // Base seed of the measurement (run i uses seed + i). It is not the drift seed (statsDrift.seed).
  seed: 20261018,
  // Day-level logging intensity: a label present on a day is kept with the probability of that day's level.
  levels: { high: 1, low: 0.5 },
  // Probability that the level stays the same from one day to the next. The chain starts in the high level.
  pStay: 0.9,
  // Phase 4d, G7b (mode 'shared-half'): the share of labels the shared factor acts on. A random half, so label count
  // (the logging-volume measure) is only a partial proxy for the factor.
  halfShare: 0.5,
  // Weekly cycle: the first floor(share x count) labels get an amplitude and a phase; the others get none.
  weekly: {
    share: 0.5,
    // Amplitude is drawn uniformly below ampMax. With ampMax 0.8 every weekday's keep probability is at least 1/9.
    ampMax: 0.8,
  },
};
