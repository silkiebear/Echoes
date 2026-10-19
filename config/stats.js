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
  // Derived (4c.0.3): a discovery with an adjusted rate ratio at or above unity counts as up, below it as down.
  // Without an adjusted ratio (fisher mode) it counts as no direction.
  direction: { unity: 1 },
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
  // Choice (4d.3, option B): mode 'volume' splits the observed days of each block into intensityBands bands by the number
  // of distinct labels logged that day. It FAILED the nulls (G1, G6, P6) and the G7 and G7b gates in phase 4d because the
  // exposure's own presence raises the volume of its days (notes\phase4d.md section 7), so the default stays 'blocks'
  // (the 4b method, unchanged) until the user decides.
  strata: { days: 30, mode: 'blocks', intensityBands: 3 },
  // Derived (4d.3): quantiles of the distinct labels per observed day, reported as counts (nearest rank).
  dayVolumeQuantiles: [0.1, 0.5, 0.9],
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
    hideFlagged: 'Hide rows with warnings',
    // "{shown}": rows left after hiding; "{returned}": rows the engine kept (at most keepTop).
    rowsShown: '{shown} of {returned} rows shown',
    // Label filter (4b.4): applied on the next Run, after the FDR step and before the keepTop cut. Text shorter than
    // filterMinChars (after NFC and trim) means no filter. "{filtered}": rows that match, before the cut.
    filterMinChars: 2,
    filter: {
      placeholder: 'Filter by label text',
      label: 'Label filter text',
      roleLabel: 'Label role for the filter',
      roles: { either: 'either label', exposure: 'exposure only', outcome: 'outcome only' },
      help: 'The filter applies on the next Run. It does not change any result.',
      matches: '{filtered} rows match the filter',
    },
    // Shown when hiding leaves no row. It states the fact only: it does not say the results are right or wrong.
    allFlagged: 'Every row has a warning, and "Hide rows with warnings" is on. Turn it off to see them.',
    // Card sort control (M4). Client-side only: engine order is never changed and no row is hidden.
    sortModes: { q: 'Engine order', placebo: 'Shift-tested rows first' },
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
    sortHelp: 'Shift-tested rows first puts rows that had the shift test before the rest; both orders keep every row.',
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
      failsFdr: 'did not pass the check for chance',
      failsTimeSplit: 'not confirmed in second half',
      lowCompletenessSensitive: 'changes without low-coverage days',
      highAutocorrelation: 'streaky data',
      newLabel: 'label is new',
      shortWindow: 'very short window',
      directionAmbiguity: 'direction unclear',
    },
    // Plain-language layer (phase 4c, 4c.0b). The default view uses these texts only. Words such as rate ratio, FDR,
    // q, placebo, p-value, significant, stratified, Mantel and autocorrelation stay out of them (a test checks this);
    // the technical line and the technical summary are the only places for those words.
    plain: {
      // Percent and ratio formatting: a fraction times percentScale, with these digits.
      percentScale: 100,
      percentDigits: 0,
      timesDigits: 1,
      diffDigits: 1,
      shiftDigits: 1,
      // A ratio within this distance of 1 reads as the usual rate.
      usualBand: 0.05,
      unknownLabel: 'an unnamed label',
      unknownWindow: 'an unknown window',
      effect: 'On the {days} days you logged "{exposure}", "{outcome}" was logged at least once in {window} on {rate} of them.',
      usual: 'On all days the usual figure is {base}.',
      ratio: 'That is about {ratio} times the usual rate.',
      ratioLess: 'That is only about {ratio} times the usual rate (less often than usual).',
      ratioUsual: 'That is about the usual rate.',
      noRate: 'Not enough days to say how often the outcome followed.',
      noBase: 'The usual figure is not available.',
      noRatio: 'The comparison with the usual rate is not available.',
      verdict: {
        pass: 'Passed the check for chance. Many pairs were compared, so some look strong by luck; of the results that pass, only a small share (at most about {falseShare} in 100) are expected to be false alarms.',
        passWarnings: 'Passed the check for chance, but read the warnings below.',
        fail: 'Did not pass the check for chance. With {family} pairs compared, some will look this strong by luck alone.',
      },
      shift: 'Shift test: when your "{exposure}" dates were moved around in time at random, an effect this big appeared in {share} of tries. Lower is better.',
      noWarnings: 'No warnings.',
    },
    // Window phrases for the row head and the effect sentence; one entry per id in config\windows.js.
    windowPhrases: {
      '1d': 'the next day',
      '3d': 'the next 3 days',
      '1w': 'the next week',
      '2w': 'the next 2 weeks',
      '1m': 'the next month',
      '3m': 'the next 3 months',
      '6m': 'the next 6 months',
      '1y': 'the next year',
      '2y': 'the next 2 years',
      '5y': 'the next 5 years',
      '10y': 'the next 10 years',
    },
    // Short window labels for the plain summary (by window).
    windowShort: {
      '1d': '1 day',
      '3d': '3 days',
      '1w': '1 week',
      '2w': '2 weeks',
      '1m': '1 month',
      '3m': '3 months',
      '6m': '6 months',
      '1y': '1 year',
      '2y': '2 years',
      '5y': '5 years',
      '10y': '10 years',
    },
    // One sentence per warning (flags.js ids, plus longRuns). failsFdr is not a warning: the verdict states it.
    flagExplain: {
      lowSample: 'Few days: only a small number of days back this up, so the figure can swing a lot.',
      failsFdr: 'Shown in the verdict.',
      failsTimeSplit: 'Did not hold up in both halves of your history, so it may come from one period only.',
      lowCompletenessSensitive: 'Changes when days with few logged items are left out.',
      highAutocorrelation: 'The shift test says this could come from streaks rather than a link.',
      newLabel: 'One of the labels is recent, so there is little history.',
      shortWindow: 'Very short window: effects within a few days are easily mixed up with same-day logging habits.',
      directionAmbiguity: 'The reverse direction looks about as strong, so it is unclear which comes first.',
      longRuns: 'Long-run label: one of the labels comes in long streaks, which makes chance patterns look stronger; treat this result as unreliable.',
    },
    // Plain summary above the rows (default view). "{cells}": combinations tested; the rest are counts.
    plainSummary: {
      checked: 'Checked {cells} combinations of an event, an outcome and a time window.',
      none: 'No combination passed the check for chance.',
      passed: '{discoveries} passed the check for chance: {without} without long-run labels and {withLong} with them (unreliable).',
      direction: 'Of the {discoveries}, {up} show the outcome more often than usual and {down} less often.',
      noDirection: 'Without a direction: {count}.',
      byWindow: 'Results by time window: {list}.',
      // Decision A (phase 4d): the check does not adjust for how many items were logged on a day or for weekly patterns.
      limits: 'The check does not allow for how many items you logged on a day, or for weekly patterns.',
      caution: 'Passing the check does not show that a result is real.',
    },
    // The technical layer: shown only with "Show technical numbers". Each number carries its meaning.
    technical: {
      toggle: 'Show technical numbers',
      line: 'rate ratio (how many times as often, adjusted for slow changes over time) {rr} · difference (percentage points above usual) {diff} · days with the exposure {n} · q (false-alarm rate after the correction for many comparisons) {q} · shift-test p (share of random shifts that look as strong; only run on the {topK} strongest) {placebo}',
      notKept: 'not kept (too weak)',
      notRun: 'not run',
      summaryUntested: 'untested: {count}',
      // The strata rule in words for the technical summary: 'blocks' (4b) or 'volume' (4d.3, option B).
      rule: { blocks: 'strata: {days}-day blocks', volume: 'strata: {days}-day blocks, each split into {bands} bands by distinct labels per day' },
      volumeLine: 'distinct labels per observed day (logging volume): min {min} · 10th percentile {p10} · median {median} · 90th percentile {p90} · max {max}',
    },
    howToTitle: 'How to read this',
    // Shown at the top of the results, closed by default.
    howToRead: [
      'Each row is one pair: an event (the first label), an outcome (the second label) and a time window. The arrow means "was followed by": the outcome was logged after the event. It does not show that the event caused it.',
      'The window says how long after the event the outcome is counted, for example "the next week".',
      'The percentages are shares of days. The first is the share of the days with the event after which the outcome was logged in the window. The usual figure is the share of all days.',
      'The check for chance: many pairs are compared, and some look strong by luck. A row that passed the check is less likely to be luck, but passing does not prove a link.',
      'Warnings name a reason for caution, each with a short explanation. Read every warning before you trust a row.',
      'This finds patterns in your logs, not causes. "Show technical numbers" adds the figures behind each row, each with its meaning.',
    ],
    // Text groups (phase 4e, 4e.2): the caption word shown on each group, and the group of each how-to paragraph (one
    // entry per howToRead text, in order; a test checks the lengths). Captions are the only text here for the groups.
    groups: {
      captions: {
        what: 'What it shows',
        how: 'How to read it',
        check: 'Check for chance',
        numbers: 'Numbers',
        care: 'Be careful',
      },
      howToKind: ['what', 'how', 'numbers', 'check', 'care', 'how'],
    },
  },
};
