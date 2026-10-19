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
  mood: { fallbackColor: '#9aa1b0' },
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
    // Mood day rule: a day with no mood score is drawn as its own class, not as the worst mood.
    noMoodNote: 'Grey days have no mood entry.',
  },
};
