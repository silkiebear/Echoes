// Texts for the "How to read this" block of every Explore card, the glossary card and the "In this chart" line (phase 4e,
// 4e.1). One object per card id, four parts each: what (what the card shows), how (how to read the graphic and its
// controls), numbers (every printed number, its unit and how it is counted), care (what the card cannot show). Written
// from the view headers and builders (4e.1 reading) in plain language (SPEC 15). The limit per part is explore.help.maxChars.
// Choice: the four captions are the group words of 4e.2 (what, how, numbers, care); "Be careful" marks the last part.
export const exploreHelp = {
  ui: {
    toggle: 'How to read this',
    // Collapses the glossary list only; separate from the "How to read this" block (decision D9).
    legendToggle: 'Legend',
    // "{name}": the glossary card's title.
    glossaryLink: 'Terms such as observed day are explained in "{name}" at the top of Explore.',
  },
  captions: {
    what: 'What it shows',
    how: 'How to read it',
    numbers: 'Numbers',
    care: 'Be careful',
  },
  // In this chart: one or two sentences from the current data, shown above the chart.
  live: {
    caption: 'In this chart',
    // Percentages in the live sentences: whole percent (toFixed digits).
    percentDigits: 0,
  },
  glossary: {
    title: 'Words used here',
    terms: [
      { term: 'Observed day', text: 'A day with at least one entry. Days without entries are gaps: they are left out of every share and are not counted as zero.' },
      { term: 'Logged or present', text: 'A label is logged, or present, on a day when at least one entry of that day carries it.' },
      { term: 'Event and outcome', text: 'In E1, E2 and E4 the first selected label is the event unless the Event select changes it. E2 takes one outcome (the second selected label unless the Outcome select changes it); E1 and E4 compare the event with every other selected label. E1 and E2 look at the outcome after the event; E4 compares it before and after.' },
      { term: 'Window', text: 'The number of days counted on each side of an event (E1 and E4), or the number of observed days in each rolling share (T4).' },
      { term: 'Usual rate', text: 'The share of all observed days on which the outcome is logged. E2 draws it as a flat line; it is the comparison point, not a test.' },
      { term: 'Rate ratio', text: 'How often the outcome is logged in the window after an event, compared with its usual rate: 1 is no change, 2 is twice as often. E1 shows the adjusted version, which compares days within blocks of 30 days, counted from the first observed day.' },
      { term: 'Placebo band', text: 'The shaded band on E2 is the same measure after the events were moved to other days by shuffling, which keeps streaks. A placebo is a stand-in with the link broken on purpose. A point outside the band is unusual compared with that spread; it is not a test.' },
      { term: 'Dashed outline', text: 'Marks a cell or row with a warning. The card note and the warning text say what it is.' },
      { term: 'Not kept, n/a', text: 'The last Echo scan has no row for that pair and window, so the card has no value for the cell. E1 prints n/a.' },
      { term: 'Export file', text: 'The text file your tracker app exports: one entry per row, with its date, mood and labels.' },
      { term: 'Settings file', text: 'An optional JSON file with your mood order, your categories and the app options. Load it with the export; Export settings writes one.' },
      { term: 'Entry', text: 'One record in the export: a mood on a date, with a time when the tracker stored one, and its labels.' },
      { term: 'Diagnostics file', text: 'A text file for checking a problem. It describes the app and its checks; with data sections on, it also has counts.' },
      { term: 'Token', text: 'A short code, such as Label 001, that stands in for your label or mood text in the diagnostics file, so the file does not show your words.' },
      { term: 'Self-test', text: 'A built-in check of the app in this tab. Each check passes, fails or is skipped.' },
      { term: 'Privacy check', text: 'A test of what this page can do in this tab: whether a network request is blocked, and what a file read reports.' },
      { term: 'Coverage', text: 'How much of the export is usable: the days, the entries and the marks per day, and how many days have few marks.' },
      { term: 'Label code', text: 'The code at the end of a label, such as Fb--: a category, an optional subcategory and a value mark. The label naming guide explains it.' },
    ],
  },
  // Gallery texts (phase 4f.4). The banner sits at the top of each Gallery group; the E3 entry is the only Gallery card that
  // has no Explore twin (every other Gallery card reuses the entry of its view id).
  gallery: {
    banner: 'This chart uses made-up data to show what the view looks like. It says nothing about your data.',
  },
  // Help of the Data and Tools modules (phase 4f.3). Modules that show help per card (Explore) and the Gallery (phase 4f.4)
  // are listed in moduleExceptions with the reason, and the Node test checks that every module is in one of the two.
  moduleExceptions: {
    'explore-select': 'Explore: help per card (the select card).',
    'explore-time': 'Explore: help per card (T1 to T4).',
    'explore-periodic': 'Explore: help per card (P1 to P4).',
    'explore-echo': 'Explore: help per card (E1, E2, E4).',
    'explore-help': 'Explore: the glossary card.',
    gallery: 'Gallery: help per card, with the same entries as the Explore cards.',
    'gallery-time': 'Gallery: help per card, with the same entries as the Explore cards.',
    'gallery-periodic': 'Gallery: help per card, with the same entries as the Explore cards.',
    'label-guide': 'Data: the label naming guide has its own help block (config label-guide).',
  },
  modules: {
    status: {
      what: 'Shows the app name, its version, a note that data stays in this tab, whether the page files are up to date, and the list of sections.',
      how: 'After an update, check that the version is the one you expect. If the page files are old, clear the site data, reload, and check again.',
      numbers: 'This card counts nothing. The version is the build number in the first line.',
      care: 'Reloading the page clears the export loaded in this tab, so load it again afterwards. Your settings are kept.',
    },
    'data-load': {
      what: 'Loads your tracker export (a .csv or .txt file) and, optionally, a settings file (.json). A made-up sample is there to try the app.',
      how: 'Pick one or both files in one step. Export settings saves the current settings to a file you can keep. Clear loaded data removes the export from this tab; the settings stay.',
      numbers: 'Entries: records in the export. Days, first to last: from the first to the last date. Labels and moods: distinct names. Rejected rows: records that could not be read and were left out.',
      care: 'The sample is made-up data, not your data. Loaded data stays in this tab; reloading the page clears it, so load the export again.',
    },
    'mood-setup': {
      what: 'Sets the order of your moods, best first, and their colours. The order gives each mood a score, and the best mood has the highest score.',
      how: 'Tap each mood from best to worst; each mood can be tapped once. When the mood names in your data change, the card asks for the order again.',
      numbers: 'The score of a mood is the number of moods minus its position, plus one. With five moods the best scores 5 and the worst scores 1.',
      care: 'A mood name must match the name in your export, including capitals and punctuation, or the app cannot place it. The order is used in every chart that shows moods.',
    },
    'q1-coverage': {
      what: 'How much of the export is usable: the days in the range, the days with entries, the entries without a time, and the marks per day.',
      how: 'An observed day is a day with at least one entry. Days without entries are gaps: they are left out of the shares and are not counted as zero.',
      numbers: 'Days in range: from the first to the last date. Median marks per day: the middle value over the days with entries. Low-completeness days: days with few marks compared with a typical day.',
      care: 'Coverage describes the export only. It says nothing about moods or labels, and a gap is not a zero.',
    },
    'q2-label-coding': {
      what: 'Counts the labels that end in a code: coded (the category is in your settings), possible code (the letter is not in your settings) and uncoded (no code). The list shows each label with its entries.',
      how: 'Open the list to see each label, how many entries carry it, and its status. The label naming guide above explains the codes and has a checker for a typed label.',
      numbers: 'Percent uncoded: the possible and uncoded labels over all labels. The list counts the entries of each label.',
      care: 'The codes change no chart or result. Renaming a label in your tracker app does not change old entries unless you edit them.',
    },
    'selftest-panel': {
      what: 'Runs the built-in checks in this tab. Each check passes, fails or is skipped.',
      how: 'Run all starts every check. A skipped check is not run here, and its reason is shown next to it. A failed check is listed with its file and name.',
      numbers: 'The counts are the passed, failed and skipped checks, and the time the run took.',
      care: 'A passed check shows that the code behaves as the check expects. It does not show that your results are right.',
    },
    'diag-panel': {
      what: 'Builds a diagnostics file: the app version, facts about the page and the browser, the status of the checks and the error counts. It is a text file you can send when something goes wrong.',
      how: 'Data sections are off by default. Turn them on only when the counts are needed. Then download, share or copy the file.',
      numbers: 'The file holds counts and settings, not your entries. Each label or mood name in it is replaced by a token, so the file does not show your words.',
      care: 'Look at the file before you send it. With data sections on, it contains counts about your data.',
    },
    'diag-check': {
      what: 'Causes one deliberate error, so you can check that the diagnostics file does not show your label text.',
      how: 'Press Trigger test error once, then download the diagnostics. The file should show a token where the test label is.',
      numbers: 'The status line counts the errors recorded in this session.',
      care: 'Each press adds an error to the diagnostics of this session. Nothing else changes.',
    },
    'privacy-probe': {
      what: 'Two checks of what this page can do in this tab: a network block test and a file read test.',
      how: 'Test network block tries to send a request and reports whether the browser blocked it. Test file read reads a file you choose here and reports its size; nothing is uploaded or stored.',
      numbers: 'The file read reports the bytes and the line breaks of the file. The network result is yes or no.',
      care: 'A blocked request is what the page is meant to do. The file read does not keep the file.',
    },
    'echo-scan': {
      what: 'Looks through your data for pairs of labels, one event and one outcome, and reports how often the outcome follows the event compared with usual. The results are listed by strength.',
      how: 'Choose the data and a mode, then press Run. Filter by label to narrow the list. The sort and the display toggles change only the view, not the scan.',
      numbers: 'Each row shows the pair, the time window, the direction (up, down or no direction) and the counts behind it. Technical numbers are behind a toggle; the block under the results explains each one.',
      care: 'A row is a lead to check, not a finding. The scan compares many pairs, so some rows appear by chance even when nothing is linked. Only the strongest rows are kept.',
    },
  },
  cards: {
    glossary: {
      id: 'glossary',
      what: 'The words used on the Explore cards, each in one sentence. The cards name these words; this card explains them.',
      how: 'Read a term here, then look for the same word in the How to read this block of a card.',
      numbers: 'This card prints no numbers.',
      care: 'The terms describe the counts. They do not say whether a pattern is real.',
    },
    select: {
      id: 'select',
      what: 'Choose the labels the Explore cards draw. Search matches part of a label and lists the labels with the most days first.',
      how: 'Type at least 2 characters, then press a result to add it. Press it again, or Remove on a chip, to take it out. Up to 8 labels. The order matters for E1, E2 and E4 by default: the first label is the event, the second is the outcome. The Event and Outcome selects on those cards change them. T1 and P1 to P4 take one label from the selection in their own list; T2, T3, T4 and the P2 rings use all of it.',
      numbers: 'The number on each result is the days the label is on, counted over every day in the export. The code, when the label has one, comes first.',
      care: 'Choosing labels tests nothing: the cards only count and draw. A pair that is not in the last Echo scan has no check. The selection is kept in memory and is lost when the page reloads.',
    },
    T1: {
      id: 'T1',
      what: 'One label over one calendar year, one square per day. The colour is the mood of the day, or whether the label is present when Colour by says so.',
      how: 'Weeks puts weekdays in rows and weeks in columns. Months puts months in rows and days of the month in columns. Year and Label pick the year and the label. The Uses line names the label. Grey squares have no mood entry.',
      numbers: 'The note counts the days with the label in the year. The key lists the moods best first; each day colour is the mood of that day, which is the mean score of its entries rounded to the nearest whole score.',
      care: 'A day without a mood entry is shown as grey, not as the worst mood. The card shows one year and one label. It describes the days; it does not test whether a pattern is chance.',
    },
    T2: {
      id: 'T2',
      what: 'The selected labels as rows over the same days, with a mood band underneath.',
      how: 'Each row is a label; a tick marks a day with the label. The band is the mood of each day, coloured by the key, which lists the moods best first. Range picks how many recent days are shown. The Uses line says the card draws all selected labels.',
      numbers: 'The note lists the days present for each label over the whole export, not only the days in the range. When one pixel holds more than one day, a tick means at least one of those days has the label, and the band shows the mean mood of the group.',
      care: 'Days without entries are gaps in the band, not zeros. The rows show when labels are present; they do not show whether labels go together.',
    },
    T3: {
      id: 'T3',
      what: 'For each selected label, one row over the last 12 calendar months: bar height is how often the label is on in that month.',
      how: 'Bar height is the share of the month observed days with the label. The number beside the row is the last month count; the triangle and its number show the change against the month before. The trend word follows the slope of the bars: rising, falling or flat. The Uses line says the card draws all selected labels.',
      numbers: 'Counts and changes are days with the label. The change is the last month minus the month before, with a sign. Only observed days are counted, so a month with few entries has few days in its share.',
      care: 'A month with few observed days moves a lot when one day changes. The trend describes the 12 months; it does not test whether the change is larger than chance.',
    },
    T4: {
      id: 'T4',
      what: 'For each selected label, a rolling share: the share of observed days with the label in a window of recent observed days.',
      how: 'Each point is the share for one window. The line moves one observed day at a time as the window moves forward. Window picks the length of the window in observed days. The Uses line says the card draws all selected labels.',
      numbers: 'Values are shares of the window observed days, from 0 to 100 percent. The note lists the days present for each label over the whole export.',
      care: 'The window counts observed days, not calendar days, so a gap in the entries does not show as zero. Long series are averaged into fewer points. The card describes the data only.',
    },
    P1: {
      id: 'P1',
      what: 'Marks by weekday and clock hour, using only entries with a clock time. Rows are weekdays and columns are the 24 hours.',
      how: 'Each square is one weekday and one hour; a darker square holds more marks. All labels counts every label on an entry, so an entry with three labels adds three marks. Label picks all labels or one label from the selection; Metric picks Count or Share of marks. The Uses line names the label or says all selected labels.',
      numbers: 'Count: the marks in the square. Share: the square marks as a part of all marks in the view. The note counts the untimed entries, which are not drawn.',
      care: 'Entries without a clock time are not drawn. When most entries share one time, the note under the chart says the pattern tells little. The card does not test whether a square differs from chance.',
    },
    P2: {
      id: 'P2',
      what: 'Marks by hour of day on a 24-hour dial, using only entries with a clock time. Hour 0 is at the top, and the hours run clockwise.',
      how: 'Variant Wedges shows one label; each wedge is one hour, and a longer wedge holds more marks. Variant Rings stacks one ring per selected label. Label picks the label for Wedges. Rings draw all selected labels, so the Label select is hidden for them.',
      numbers: 'A wedge or ring segment is the number of entries that carry the label in that hour. The note counts the untimed entries, which are not drawn.',
      care: 'Only entries with a clock time are drawn. The note under the chart about one shared time applies here too. A longer wedge is not proof of a habit; the card counts entries.',
    },
    P3: {
      id: 'P3',
      what: 'Share of observed days with the label, by weekday: one bar per weekday, with a line for the usual share over all observed days.',
      how: 'Bar height is the share of that weekday observed days that have the label. The percentage above each bar is that share. The number under each bar is the days with the label on that weekday. The weekday order starts on the first day of the week set in the time settings. The Label select picks the label; the Uses line names it.',
      numbers: 'Percentage above a bar: days with the label divided by the observed days of that weekday. Number under a bar: the days with the label on that weekday. The numbers under all bars add up to the days-present figure in the note.',
      care: 'Each weekday has its own count of observed days, so a weekday with few observed days can move a lot. A taller bar describes the data; it does not show that the weekday causes anything.',
    },
    P4: {
      id: 'P4',
      what: 'Share of observed days with the label, by month of the year, with the years pooled: one bar per month, with a line for the usual share.',
      how: 'Bar height is the share of that month observed days that have the label. The percentage above each bar is that share. The number under each bar is the days with the label in that month. Each month is counted across all years in the export. The Label select picks the label; the Uses line names it.',
      numbers: 'Percentage above a bar: days with the label divided by the observed days of that month, across years. Number under a bar: the days with the label in that month. The numbers under all bars add up to the days-present figure in the note.',
      care: 'Months are pooled over the years in the export, so a month can mix years with different entry counts. The card describes the data; it does not test whether a month differs from chance.',
    },
    E1: {
      id: 'E1',
      what: 'The outcomes (rows) by time window (columns) after the selected event, the first label unless the Event select changes it. The values come from the last Echo scan, and only for pairs in that scan.',
      how: 'Each cell is the scan adjusted ratio for the event, the outcome and the window: 1 means no change, above 1 means the outcome is more often logged after the event, below 1 means less often. Cell colour follows the ratio. A dashed outline marks a cell with a warning. n/a means the scan has no row for that cell. The Event select picks the event; the other selected labels are the outcomes, up to eight.',
      numbers: 'The number in a cell is the adjusted ratio of the scan row. The adjustment compares days within blocks of 30 days, counted from the first observed day, as the scan does. The note names the event.',
      care: 'The scan keeps only its strongest rows, so many pairs have no cell. A passed check is not proof that the link is real. The scan does not allow for day-to-day logging volume or weekday cycles.',
    },
    E2: {
      id: 'E2',
      what: 'The outcome rate on each day after the event, from one to several days, for the selected pair. The shaded band is what the same measure gives for events moved to other days by shuffling.',
      how: 'The horizontal axis is the days after the event. The line with dots is the outcome rate on that day. The flat line is the usual rate. A point above the shaded band is higher than the shuffled events at that day; a point inside the band is within their spread. The Event and Outcome selects pick the pair; the Uses line names both.',
      numbers: 'The vertical labels are percentages of observed days. The usual rate is the share of all observed days with the outcome. Each rate counts observed days only.',
      care: 'The band uses a fixed seed and a set number of shuffles. Where no shuffle has an event on a day, the band falls back to the usual rate. A point outside the band is a reason to look closer, not proof of a link. Gaps in the line mean no observed day at that lag.',
    },
    E3: {
      id: 'E3',
      what: 'The strongest exposure and outcome pairs, ranked by the ratio of the outcome rate after the exposure to its overall rate, over the time windows.',
      how: 'Each row is one pair. Hide flagged results removes the rows that carry a warning. Flags are shown as short labels on the row.',
      numbers: 'The ratio is the outcome rate after the exposure divided by the overall outcome rate: 1 means no change, above 1 means the outcome is more often logged after the exposure. The rank is the position of the pair in the list.',
      care: 'The gallery uses made-up data, so the ranking shows only how the view looks. A top rank can come from chance; use the Echo scan on your data to look for pairs.',
    },
    E4: {
      id: 'E4',
      what: 'For each outcome, the change in its share of observed days after the event compared with before it, averaged over the events.',
      how: 'Each row is one outcome. A bar to the right means the outcome is more common after the event; a bar to the left means less common. Rows are sorted by the size of the change. The window sets how many observed days are counted on each side. The Event select picks the event; the other selected labels are the outcomes, up to eight.',
      numbers: 'The number at the end of each bar is after minus before, as a share of observed days: 0.10 is 10 percentage points. The Events count at the top is the number of events: days with the event that have a full window on both sides and no event in the days before (the gap is the number of days set in the configuration).',
      care: 'With few events the difference is unstable, and the card marks that with a warning. The window counts observed days, not calendar days. The card gives a plain difference, with no check for chance.',
    },
  },
};
