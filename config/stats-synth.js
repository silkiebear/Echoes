// Synthetic wide dataset for the statistics engine (generator: core/synth-wide.js). Everything here is invented.
// Planted effects are the only signal; fillers and streaks are noise that the engine must not rank above them.
// Expected values for the planted effects are derived in notes\phase3.md before any measurement.
export const statsSynth = {
  days: 1100,
  startDate: '2022-01-01', // UTC
  // Filler labels with independent random days (noise). The large variant is for the performance check only.
  fillerCount: 300,
  fillerCountLarge: 900,
  // Range of the filler labels' daily rates (the generator sets the distribution within it).
  baseRate: { min: 0.002, max: 0.3 },
  seed: 20261015,
  plants: {
    // Up: exposure on a day raises the outcome on the next day (lag 1). pGiven is the outcome rate after the exposure.
    up: { pExposure: 0.2, pBase: 0.1, pGiven: 0.6, lag: 1 },
    // Down: the same shape, with the outcome strongly suppressed after the exposure.
    down: { pExposure: 0.25, pBase: 0.2, pGiven: 0.02, lag: 1 },
    // Late: the up effect appears only in the second half of the days (time-split test).
    late: { pExposure: 0.2, pBase: 0.1, pGiven: 0.6, lag: 1, startFraction: 0.5 },
    // Streak: two labels that switch on and off in long runs. They share no effect, but their runs make a plain
    // independence test over-reject (autocorrelation trap). pStart is the chance a run starts a day; pStay the chance it continues.
    streak: { pStart: 0.02, pStay: 0.95 },
  },
};
