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
    { name: 'Deadline', code: 'W-', p: 0.25 },
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
  expect: {
    labelCount: [20, 24],
    coffeeSleep1d: [1.5, 2.4],  // planted effect 1, 1-day window (derived above: 1.96)
    alcoholHeadache1d: [1.4, 2.3], // planted effect 2, 1-day window (derived above: 1.81)
  },
};
