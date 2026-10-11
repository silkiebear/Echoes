// Badge flags (SPEC 13). `short` is the pill text. The demo block drives only the gallery's demo flags,
// which are never computed by a statistic and are labelled DEMO in the views.
export const flags = [
  { id: 'lowSample', short: 'low n', description: 'Too few exposed days for a stable rate.' },
  { id: 'failsFdr', short: 'FDR', description: 'Does not survive false discovery rate correction.' },
  { id: 'failsTimeSplit', short: 'split', description: 'Not confirmed on the second half of the data.' },
  { id: 'lowCompletenessSensitive', short: 'low-cov', description: 'Changes when low-completeness days are removed.' },
  { id: 'highAutocorrelation', short: 'streaks', description: 'Long streaks shrink the effective sample size.' },
  { id: 'newLabel', short: 'new', description: 'Label first used recently.' },
  { id: 'shortWindow', short: 'short', description: 'Window is very short.' },
  { id: 'directionAmbiguity', short: 'A/B?', description: 'Direction A to B and B to A cannot be told apart.' },
];

export const demo = {
  lowSampleBelow: 10,        // exposed days below this get lowSample
  shortWindowDaysAtMost: 1,  // windows this short get shortWindow
  forcedEveryCell: 4,        // every Nth computed matrix cell gets a forced demo flag
  forcedEveryRow: 2,         // every Nth ranking row gets a forced demo flag
  // Cycled in order, so 8 forced flags on 15 ranking rows (every 2nd row) show every badge style.
  forced: ['failsFdr', 'failsTimeSplit', 'lowCompletenessSensitive', 'highAutocorrelation', 'newLabel', 'directionAmbiguity', 'shortWindow', 'lowSample'],
};
