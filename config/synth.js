// Synthetic data for the gallery and tests. Only the planted effects carry signal; everything else is noise.
// Label format follows SPEC 11: "<name> <code>". Effect outcomes: `p` is the outcome's unexposed rate,
// so it equals that effect's pBase (the generator uses pBase).
//
// Expected 1-day rate ratio (exposure at day d, outcome at day d+1), for a planted effect:
//   rate = pExposed (the lag is inside the range)
//   baseline = pBase + (pExposed - pBase) * q, where q = P(exposure in the lag range) = 1 - (1 - pe)^(lag span)
//   rr = rate / baseline
// Effect 1: pe = 0.30, q = 0.30, baseline = 0.15 + 0.35 * 0.30 = 0.255, rr = 0.50 / 0.255 = 1.96.
// Effect 2: pe = 0.20, q = 1 - 0.80^2 = 0.36, baseline = 0.12 + 0.28 * 0.36 = 0.221, rr = 0.40 / 0.221 = 1.81.
// Effect 3 (Deadline to Anxious, lags 7 to 14, E2): the exposure rate is 0.05, not 0.25. At 0.25, q = 1 - 0.75^8 = 0.90,
// so the outcome baseline is already about 0.38 and lags 7 to 14 (0.40) show no contrast (measured ratio 1.05).
// At 0.05, q = 0.34, baseline = 0.20 + 0.20 * 0.34 = 0.27, ratio 0.40 / 0.27 = 1.48 (measured 1.46).
// The ranges below allow about +-25 percent: sampling noise on 1460 days is about +-8 percent.
export const synth = {
  seed: 1729,
  startDate: '2022-01-01', // UTC
  days: 1460,
  labels: [
    { name: 'Late coffee', code: 'F-', p: 0.30 },
    { name: 'Poor sleep', code: 'S-', p: 0.15 },
    { name: 'Alcohol', code: 'H-', p: 0.20 },
    { name: 'Headache', code: 'B-', p: 0.12 },
    { name: 'Long walk', code: 'A+', p: 0.30 },
    { name: 'Calm', code: 'M+', p: 0.25 },
    { name: 'Deadline', code: 'W-', p: 0.05 },
    { name: 'Anxious', code: 'M-', p: 0.20 },
    { name: 'Friends meetup', code: 'P+', p: 0.30 }, // weekday modifier below replaces p
    { name: 'Morning run', code: 'A+', p: 0.40 },
    { name: 'Water intake', code: 'B+', p: 0.55 },
    { name: 'Screen time', code: 'H-', p: 0.45 },
    { name: 'Sugar snack', code: 'F-', p: 0.35 },
    { name: 'Vegetables', code: 'F+', p: 0.50 },
    { name: 'Meditation', code: 'M+', p: 0.15 },
    { name: 'Commute', code: 'T-', p: 0.60 },
    { name: 'Vivid dream', code: 'D-', p: 0.10 },
    { name: 'Lucid dream', code: 'D+', p: 0.10 },
    { name: 'Study session', code: 'W+', p: 0.40 },
    { name: 'Hot bath', code: 'B+', p: 0.25 },
    { name: 'Travel', code: 'E=', p: 0.12 },
    { name: 'Argument', code: 'P-', p: 0.12 },
  ],
  effects: [
    { exposure: 'Late coffee F-', outcome: 'Poor sleep S-', lagMin: 1, lagMax: 1, pBase: 0.15, pExposed: 0.50 },
    { exposure: 'Alcohol H-', outcome: 'Headache B-', lagMin: 1, lagMax: 2, pBase: 0.12, pExposed: 0.40 },
    { exposure: 'Long walk A+', outcome: 'Calm M+', lagMin: 1, lagMax: 3, pBase: 0.25, pExposed: 0.45 },
    { exposure: 'Deadline W-', outcome: 'Anxious M-', lagMin: 7, lagMax: 14, pBase: 0.20, pExposed: 0.40 },
  ],
  weekday: [{ label: 'Friends meetup P+', weekend: 0.60, weekday: 0.15 }],
  // Mood (integer 1 to 5, index 0 = "bad"). Planted effect: the day after Poor sleep S-, each mood score
  // drops one step with a seeded chance drawn once from sizeRange. Uses its own PRNG (seed + seedOffset),
  // so the label stream above is unchanged.
  mood: {
    weights: [0.10, 0.20, 0.30, 0.25, 0.15], // score 1 to 5
    seedOffset: 7919,
    sizeRange: [0.3, 0.5],
    poorSleep: 'Poor sleep S-',
  },
  // Time of day for entries (core/time-entries.js). Day minutes run from dayStartMinutes (04:00) to 1679 (03:59 next
  // calendar day). Values are sampled from a normal distribution (center, sd) and clamped to that range. Labels without
  // a profile are uniform from `defaultUniform`. Uses its own PRNG (seed + seedOffset), so the label stream is unchanged.
  timeOfDay: {
    mode: 'varied',           // 'varied', or 'single': one entry per day at singleMinutes with all labels
    seedOffset: 104729,
    singleMinutes: 720,       // 12:00
    dayStartMinutes: 240,     // same value as time.dayBoundaryMinutes in config/views.js
    entryGranularityMinutes: 60,
    defaultUniform: { from: 420, to: 1380 }, // 07:00 to 23:00
    profiles: {
      'Late coffee F-': { center: 900, sd: 120 },  // 15:00
      'Morning run A+': { center: 420, sd: 45 },   // 07:00
      'Poor sleep S-': { center: 510, sd: 60 },    // 08:30
      'Vivid dream D-': { center: 420, sd: 45 },   // 07:00
      'Alcohol H-': { center: 1290, sd: 90 },      // 21:30
      'Screen time H-': { center: 1470, sd: 90 },  // 00:30 on the next calendar day
    },
  },
  // Seasonal planted effect: the label's daily probability is multiplied in these months (capped at 1). It does not
  // change the number of random draws, so the other expectations hold.
  seasonal: { label: 'Hot bath B+', months: [12, 1, 2], multiplier: 2 },
  expect: {
    labelCount: [20, 24],
    // Hot bath B+ (base p 0.25): winter p is 0.50, so the winter-to-other rate ratio is about 2. Sampling noise with
    // about 90 winter days gives roughly +/- 20 percent, so the range is 1.6 to 2.4.
    seasonalRatio: [1.6, 2.4],
    // Alcohol H- to Headache B- (E4, window 3 days): after rate about 0.34 (days 1 and 2 at 0.40, day 3 about 0.22),
    // before rate 0.12, so the difference is about 0.22. Range is wide enough for sampling noise.
    alcoholHeadacheDiff3d: [0.15, 0.30],
    // Screen time H-: share of its entries in calendar hours 0 to 3. Normal(1470, 90): P(1440 <= X < 1680) is about 0.620,
    // plus the clamped tail above 1679 (about 0.010, still hour 0 to 3), so about 0.63. Range is +/- 0.08 around it.
    screenNightShare: [0.55, 0.70],
    coffeeSleep1d: [1.5, 2.4],  // planted effect 1, 1-day window (derived above: 1.96)
    alcoholHeadache1d: [1.4, 2.3], // planted effect 2, 1-day window (derived above: 1.81)
    minRatio: 1.25,             // planted effect 3 (Deadline to Anxious): mean rate over lags 7 to 14 >= baseline * minRatio (measured 1.46)
    moodAfterPoorSleep: [-0.6, -0.12], // mean mood difference, day after Poor sleep minus other days (expected about -0.36)
  },
};
