// Texts and tunables for the Explore tab and the Tools check card (phase 4c). Every string the user sees lives here.
// moodHint: one line under the data status when a loaded mood name has no preset (4c.0b, data-load.js).
// diagCheck: the Tools card that throws a test error (4c.0.1). The demo label is not user data; it is registered only
// when the button is pressed, so the diagnostics redaction is exercised and the mount does not register anything.
export const moodHint = 'Some mood names need an order: open Tools, Mood order.';

export const diagCheck = {
  title: 'Diagnostics check',
  note: 'Throws an error later, outside the click handler. The diagnostics file should show a token, not the label text.',
  button: 'Trigger test error',
  demoLabel: 'Diagnostics check label',
  errorPrefix: 'Deliberate test error near',
  // "{count}": errors captured this session, read after the error has been captured.
  recorded: 'Test error recorded ({count})',
};

// Explore tab (phase 4c, 4c.2): label search, selection and the T views on real data. Descriptive only.
export const explore = {
  // Choice: at most 8 labels, so the lanes and the chips stay readable at 320 px.
  // Choice: 2 characters, so a single letter does not list most labels.
  // Choice: 40 results, so the list stays a short scroll on a phone.
  selection: { max: 8, minChars: 2, maxResults: 40 },
  // Choice: one part of a "How to read this" block (config\explore-help.js) is at most this many characters, so the
  // block stays a short read on a phone at 320 px (4e.1).
  help: { maxChars: 480 },
  // Choice: a day's mood is the mean of its entries' scores, rounded to the nearest whole score (halves round up).
  dayMood: { rounding: 'nearest' },
  // A stored mood colour that is not #rrggbb is drawn in this grey instead (4d.0.2). Same value as views.js
  // fallbackColor (the M2 setup preview), kept here so the Explore views do not depend on the gallery config.
  // digits: decimals of the mood means and the range in the M1 card (a choice: a score step is 1, so two decimals show a
  // difference of a tenth).
  mood: { fallbackColor: '#9aa1b0', digits: 2 },
  // Message drawn when a card has nothing to show yet (4e.0.2). The text wraps to the card width; the height follows
  // the line count. Choice: fontPx matches views.js text.fontPx; lineHeight leaves room for descenders; padding is the
  // inset on every side, in CSS px.
  message: { fontPx: 12, lineHeight: 16, padding: 8 },
  // Choice: hour-of-day bins for the P2 dial (must divide 24; the gallery uses 24, one bin per hour).
  periodic: { dialBins: 24 },
  ui: {
    selectTitle: 'Choose labels',
    tabTitle: 'Explore',
    // Shown under the search: what the views are and are not.
    descriptive: 'These views describe your data: counts and shares. They carry no significance test and no multiple-testing control.',
    searchLabel: 'Search labels',
    searchPlaceholder: 'Type part of a label',
    tooShort: 'Type at least {min} characters to search.',
    noMatch: 'No label matches.',
    noData: 'Load your export in Data first. Nothing to choose yet.',
    selectionEmpty: 'Pick up to {max} labels to see them here.',
    selectionFull: 'Remove a label to pick another (up to {max}).',
    // A result button: the label text, its code when it has one, and the days it is present on.
    resultDays: '{days} days',
    codeLabel: 'code {code}',
    chipRemove: 'Remove',
    clear: 'Clear selection',
    yearLabel: 'Year',
    labelLabel: 'Label',
    rangeLabel: 'Range',
    windowLabel: 'Window',
    colourLabel: 'Colour by',
    // Card notes. "{days}": days present for the label or labels shown; each card says it is descriptive.
    noteT1: 'One label, one calendar year. Days with the label in this year: {days}. {descriptive}',
    noteT2: 'Selected labels as lanes over a mood band. Days present: {list}. {descriptive}',
    // Shares count observed days only (days with at least one entry); gap days are not in the denominator.
    noteT3: 'Last 12 calendar months; shares of observed days. Days present: {list}. {descriptive}',
    noteT4: 'Share of observed days with each label in a trailing window of that many observed days. Days present: {list}. {descriptive}',
    // Periodic cards (4c.3). P1 and P2 use the entries with a clock time; P3 and P4 use observed days.
    noteP1: 'Marks by weekday and clock time, timed entries only. Darker cells hold more marks. {untimed} {descriptive}',
    noteP2: 'Marks by hour of day, timed entries only. Wedges: marks in the hour. Rings: one per label. {untimed} {descriptive}',
    noteP3: 'Share of observed days with the label, by weekday (bar height). Under each bar: days with the label on that weekday. Days present in total: {days}. {descriptive}',
    noteP4: 'Share of observed days with the label, by month, years pooled (bar height). Under each bar: days with the label in that month. Days present in total: {days}. {descriptive}',
    untimed: '{count} entries without a time are not in these views.',
    periodTitle: 'Periodic views',
    noTimed: 'No entries with a clock time in your data.',
    periodLabelAll: 'All labels',
    periodMetric: 'Metric',
    metricCount: 'Count',
    metricShare: 'Share of marks',
    dialVariant: 'Variant',
    noSelection: 'Choose labels above to draw this view.',
    noYear: 'No days in the data for this year.',
    listSep: '; ',
    // "Uses:" line of every card (4f.2): the label or labels the card draws, named in the card. {label}, {count}, {event},
    // {outcome} and {list} are filled with label texts (set with textContent).
    usesOne: 'Uses: {label}.',
    usesAll: 'Uses: all {count} selected labels.',
    usesEventOutcomes: 'Uses: event {event}; outcomes: {list}.',
    usesEventOutcome: 'Uses: event {event}, outcome {outcome}.',
    usesJoin: ', ',
    eventSelect: 'Event',
    outcomeSelect: 'Outcome',
    // Mood day rule: a day with no mood score is drawn as its own class, not as the worst mood.
    noMoodNote: 'Grey days have no mood entry.',
    // Days together (C1). The card heading, its note, and the live sentence about the pair with the most days together.
    cooHeading: 'C1 Days together',
    noteC1: 'Observed days on which each pair of the selected labels was present on the same day. The diagonal is each label on its own. {descriptive}',
    cooLabels: 'Labels in matrix order: {list}.',
    cooNeedTwo: 'Choose at least 2 labels to see the days they share.',
    cooLive: 'The pair with the most days together is {first} and {second}, on {days} days.',
    cooNone: 'No two selected labels were on the same day.',
    // Combinations (C2): the card heading, its note, the summary line, the table headers and the cell words. The badge
    // marks the row where every selected label is present. "{names}": the labels present in the most frequent combination.
    cbHeading: 'C2 Combinations',
    noteC2: 'For the selected labels, which combinations of present and absent occurred on observed days, and how many days each. {descriptive}',
    cbSummary: 'All together: {all} days. None of them: {none} days. Some but not all: {some} days. ({n} observed days)',
    cbDays: 'Days',
    cbShare: 'Share of days',
    cbPresent: 'present',
    cbAbsent: 'absent',
    cbPresentMark: '\u25CF',
    cbAbsentMark: '\u25CB',
    cbBadge: 'all together',
    cbLive: 'The most frequent combination has {names} present, on {days} days.',
    cbNoNames: 'no label',
    cbNone: 'No observed day.',
    cbMany: 'Choose up to {max} labels for this table.',
    // Mood and this label (M1): the card heading, its note, the sentence and the table. The sentence says "score" without
    // a range of values: the mood scores run from 1 to the number of your moods, so the scale is not fixed here.
    miHeading: 'M1 Mood and this label',
    // The M1 note has no shared sentence: the card compares days of one period (phase 4h.3b).
    noteM1: 'Mean mood score on the days with one selected label and on the other days between its first and last use. It describes your data and does not show a cause.',
    miOk: 'On days with {label} your mood averaged {mean1} (mood score, higher is better); on the other days of the same period, {mean0}. The difference is {diff}. The range that fits most resamples of your days is {lo} to {hi}.',
    miTooFew: 'Not enough days with and without this label (at least {min} each) to say anything.',
    miTooSkipped: 'The range could not be worked out for this label.',
    // The first column of the table holds the groups and the difference and range rows, so it is not called "Days".
    miColGroup: 'Comparison',
    miColValue: 'Mood score',
    miRowWith: 'With {label} ({n} days)',
    miRowWithout: 'Without {label}, same period ({n} days)',
    // The active period line under the Label select: the days used, the first and last use, the days left out.
    miPeriod: 'Days used: {used}, from your first use of {label} ({first}) to your last ({last}). Observed days left out (outside this period): {excluded}.',
    miPeriodAll: 'Days used: {used}, from your first use of {label} ({first}) to your last ({last}). No observed days are left out.',
    miRowDiff: 'Difference',
    miRowRange: 'Range ({level})',
    miRangeText: '{lo} to {hi}',
    // Technical line behind "Show technical numbers" (the toggle text is config\stats.js technical.toggle).
    miNumbers: 'Seed {seed}; {resamples} resamples; blocks of {blockLength} days.',
  },
  // C1 matrix geometry (phase 4h): a cell is cellPx high and at least cellPx wide; a label is drawn in labelPx, wrapped to
  // at most headerLines lines (the column headers) or cut to rowLines (the row labels). Sizes in CSS px, text in fontPx.
  // colMaxPx (phase 4h.3c, D19): the widest a column may be. All columns share one width: the widest header word plus
  // 2 x padPx, between cellPx and colMaxPx. A word wider than colMaxPx - 2 x padPx still breaks; the matrix scrolls in its card.
  // headerAboveEm, headerBelowEm: the header text boxes, as shares of fontPx, around the centre y of a header line (the
  // same centring as the rows and cells). Measured in Chromium (4h.3): the box reaches 0.758em above the centre and
  // 0.625em below it, the 0.35em baseline shift of core\svg.js included. The values are rounded up, so the first box
  // starts at or just below the top edge and the last box ends above the first row. The 4h.3 fix (descentShare) moved
  // the header baseline by a formula that did not match this box.
  matrix: { cellPx: 44, labelPx: 96, colMaxPx: 96, headerLines: 3, rowLines: 2, fontPx: 12, lineHeight: 14, padPx: 4, radiusPx: 4, headerAboveEm: 0.77, headerBelowEm: 0.64 },
};
