// Tunables for the statistics engine (SPEC 13, notes\phase3.md decisions D1 to D10). Every number the engine uses
// lives here. "Derived" means it follows from a rule in the decisions; "choice" means a design judgment that is not
// measured and can be changed by the user.
export const stats = {
  // Derived (D2): a window needs at least this share of its days observed.
  minWindowCoverage: 0.5,
  // Derived (D2): self-pairs (exposure equal to outcome) are skipped; they test persistence, not an echo.
  includeSelf: false,
  // Derived (D3): a cell is tested only with at least this many exposed days and this many outcome days among the
  // evaluable start days. Choice of the minimum counts: the exact test is valid for any count, these only keep
  // tiny cells out of the ranking.
  minExposed: 10,
  minBaseHits: 5,
  // Derived (D4, SPEC 13): Benjamini-Hochberg false discovery rate level.
  alpha: 0.05,
  // Derived (D4 memory rule): p-values at or below this keep their exact q; larger ones are counted only.
  pKeep: 0.05,
  // Choice (D9): rows kept in the result, best by q. Bounds the result size and the card's table.
  keepTop: 500,
  // Choice (D7): a lowSample flag below this many exposed days. Thirty is a common rule of thumb for a stable rate.
  flagLowSample: 30,
  // Derived (D7): windows this short are sensitive to same-day and next-day logging shifts.
  shortWindowDays: 3,
  // Choice (D7): a label first used less than this many days before the last day is too young to judge.
  newLabelDays: 180,
  // Choice (3.2c decision): a label whose lag-1 correlation of daily presence is at least this is a long-run label.
  // The independence test is not valid for cells that involve one, so the result counts them apart and marks the rows.
  // Streak labels here measure about 0.93; independent fillers and the planted pairs measure near 0.
  autocorr: { threshold: 0.5 },
  // Derived (D8): a flag is noticed on the card when more than this share of kept rows carry it.
  noticeShare: 0.5,
  // Choice (D7): the largest change in rate ratio, as a fraction, that the low-completeness recompute tolerates.
  // Tested as |ln(rr2 / rr)| > ln(1 + lowCompletenessMaxChange).
  lowCompletenessMaxChange: 0.25,
  placebo: {
    // Choice (D5): shift shuffles. The smallest empirical p is 1 / (shuffles + 1): 300 gives 0.0033, 3000 gives 0.0003.
    shuffles: { fast: 300, deep: 3000 },
    // Derived (D5): placebo only for the top cells by p. Shuffling every tested cell would be too slow.
    topK: 200,
    // Choice (D5): shifts smaller than this keep most exposures in place (streaks), so they are not a fair null.
    minShiftDays: 14,
    // Derived (D7): placebo p at or above this flags streak-driven results (autocorrelation flag).
    alpha: 0.05,
    // Choice (D10): fixed seed, so the same input and options give the same result.
    seed: 1,
    // Derived (D5): 2.5 and 97.5 percent quantiles give a 95 percent band.
    bandQuantiles: [0.025, 0.975],
    // Choice (D5): longest lag on the placebo band curve.
    maxLag: 14,
  },
  timeSplit: {
    // Derived (D6): the confirming half must reach this level.
    alpha: 0.05,
    // Choice (D6): half of minExposed, because each half holds about half the days.
    minExposed: 5,
  },
  progress: {
    // Choice (D10 runtime): yield and cancel check interval in milliseconds (20 checks a second).
    chunkMs: 50,
  },
  perf: {
    // Choice (3.2.4): Node-only limit for a scan of the large synthetic sample. Browser time is measured, not asserted.
    maxScanMsNode: 30000,
  },
  // Choice (4b.3, D15): 'stratified' ranks cells by the stratified test with autocorrelation inflation (D11 to D14).
  // 'fisher' is the phase 3 behaviour (pooled exact test, no active-period restriction, no strata); the gates compare with it.
  scanTest: 'stratified',
  // Choice (4b.3, D12): stratum length in calendar days, counted from the first observed day.
  strata: { days: 30 },
  // Choice (4b.3, D15): a cell whose summed variance is below this is untested; the normal approximation is poor for tiny counts.
  minVariance: 2,
  // Choice (4b.2): the normal tail uses an erf series below seriesBelow and a continued fraction of this depth above it.
  // Numerical settings only; they do not change the statistics.
  normal: { seriesBelow: 3, fractionTerms: 300 },
  // Choice (4b.2, D14): the autocorrelation inflation factor is capped at max; maxRho keeps (1 + a b) / (1 - a b) finite.
  inflation: { max: 20, maxRho: 0.99 },
  worker: {
    // Module worker script, relative to core/stats/client.js. Tests and the browser run use the same path.
    path: '../stats-worker.js',
    // Error codes sent instead of any text from the scan or the data (diagnostics rule).
    scanFailed: 'scan-failed',
    workerFailed: 'worker-failed',
  },
  ui: {
    title: 'Echo scan',
    sources: {
      loaded: 'Loaded data',
      wide: 'Synthetic wide sample (not your data)',
      wideLarge: 'Synthetic wide sample, large (not your data)',
    },
    modes: { fast: 'Fast', deep: 'Deep' },
    run: 'Run scan',
    cancel: 'Cancel',
    noData: 'No data loaded',
    running: 'Scanning',
    cancelled: 'Cancelled',
    done: 'Done',
    showMore: 'Show more',
    showLess: 'Show less',
    // Display filter only: hiding never changes p, q, flags or order. A null flag is not a flag.
    hideFlagged: 'Hide flagged results',
    // "{shown}": rows left after hiding; "{returned}": rows the engine kept (at most keepTop).
    rowsShown: '{shown} of {returned} rows',
    // Label filter (4b.4): applied on the next Run, after the FDR step and before the keepTop cut. Text shorter than
    // filterMinChars (after NFC and trim) means no filter. "{filtered}": rows that match, before the cut.
    filterMinChars: 2,
    filter: {
      placeholder: 'Filter by label text',
      label: 'Label filter text',
      roleLabel: 'Label role for the filter',
      roles: { either: 'either label', exposure: 'exposure only', outcome: 'outcome only' },
      help: 'The filter applies on the next Run. Rows keep their q values.',
      matches: '{filtered} rows match the filter',
    },
    // Shown when hiding leaves no row. It states the fact only: it does not say the results are right or wrong.
    allFlagged: 'Every returned row carries a flag, and "Hide flagged results" is on. Turn it off to see them.',
    // Card sort control (M4). Client-side only: engine order is never changed and no row is hidden.
    sortModes: { q: 'By q (engine order)', placebo: 'Placebo-evaluated first' },
    labels: { source: 'Data source', mode: 'Scan mode', sort: 'Sort rows' },
    summary: {
      cells: 'Cells tested',
      // "family: <m> cells": the multiple-testing family (every tested cell, before any filter).
      family: 'family',
      familyUnit: 'cells',
      discoveries: 'Discoveries',
      longRuns: 'with long-run labels',
      withoutLongRuns: 'without long-run labels',
      ms: 'ms',
      runner: 'runner',
    },
    error: 'Scan failed.',
    longRunPill: 'long-run labels',
    longRunNote: 'Discoveries with long-run labels: q is adjusted for lag-1 autocorrelation, a first-order correction. Very long runs lower the power of the test. The adjustment does not show that a result is right.',
    // Item layout: head "#rank exposure → outcome · window"; metrics line; pill line.
    rankPrefix: '#',
    arrow: ' → ',
    sep: ' · ',
    none: '—',
    na: 'n/a',
    metricNames: { rr: 'rate ratio, adjusted', diff: 'difference', n: 'n', q: 'q', placebo: 'placebo p' },
    // Help under the sort control. Both orders keep every row; the order can look the same when the top rows have placebo p values.
    sortHelp: 'Placebo-evaluated first puts rows that had a shift placebo before the rest; both orders keep every row.',
    // Digits for p and q. Values below pSciBelow print in scientific notation, so 5e-44 is not shown as 0.
    pDigits: 3,
    pSciBelow: 0.001,
    // Choice: rows per page in the card. Phone fit is UNVERIFIED until the user test.
    pageRows: 20,
    // Test limit: an item head wraps to at most this many lines at 320 px.
    maxHeadLines: 6,
    // One entry per flag id in config\flags.js, in plain words for the card.
    pillNames: {
      lowSample: 'few exposed days',
      failsFdr: 'not significant after FDR',
      failsTimeSplit: 'not confirmed in second half',
      lowCompletenessSensitive: 'changes without low-coverage days',
      highAutocorrelation: 'streaky data',
      newLabel: 'label is new',
      shortWindow: 'very short window',
      directionAmbiguity: 'direction unclear',
    },
  },
};
