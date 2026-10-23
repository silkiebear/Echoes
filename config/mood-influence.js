// Settings of the mood-influence card (phase 4h, M1): the mean mood on days with and without one label, and a range from
// a seeded circular block bootstrap. Descriptive only: no p-value, no causal reading, not used in the scan or rankings.
export const moodInfluenceConfig = {
  // The seed makes the range repeatable: the same days give the same numbers on every load (a choice).
  seed: 20261021,
  // Number of resamples the range is taken from (a choice; more gives a steadier range and costs more time).
  resamples: 1000,
  // Days per block. Days next to each other are alike (mood runs, weekly routines), so a resample keeps runs of 7 days.
  blockLength: 7,
  // The range covers this share of the resampled differences: 0.9 is the 90 percent range.
  level: 0.9,
  // A group (days with the label, days without it) needs at least this many scored days before a mean is shown.
  // 10 is a floor for a stable mean, a choice of the design partner.
  minPerGroup: 10,
  // If more than this share of the resamples has no day in one group, the range is not reported.
  maxSkipShare: 0.5,
};
