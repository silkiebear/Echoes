// Texts for the "How to read this" block of every Explore card, the glossary card and the "In this chart" line (phase 4e,
// 4e.1). One object per card id, four parts each: what (what the card shows), how (how to read the graphic and its
// controls), numbers (every printed number, its unit and how it is counted), care (what the card cannot show). Written
// from the view headers and builders (4e.1 reading) in plain language (SPEC 15). The limit per part is explore.help.maxChars.
// Choice: the four captions are the group words of 4e.2 (what, how, numbers, care); "Be careful" marks the last part.
export const exploreHelp = {
  ui: {
    toggle: 'How to read this',
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
      { term: 'Event and outcome', text: 'In E1, E2 and E4 the first selected label is the event and the second is the outcome. E1 and E2 look at the outcome after the event; E4 compares it before and after.' },
      { term: 'Window', text: 'The number of days counted on each side of an event (E1 and E4), or the number of observed days in each rolling share (T4).' },
      { term: 'Usual rate', text: 'The share of all observed days on which the outcome is logged. E2 draws it as a flat line; it is the comparison point, not a test.' },
      { term: 'Rate ratio', text: 'How often the outcome is logged in the window after an event, compared with its usual rate: 1 is no change, 2 is twice as often. E1 shows the adjusted version, which compares days within blocks of 30 days, counted from the first observed day.' },
      { term: 'Placebo band', text: 'The shaded band on E2 is the same measure after the events were moved to other days by shuffling, which keeps streaks. A placebo is a stand-in with the link broken on purpose. A point outside the band is unusual compared with that spread; it is not a test.' },
      { term: 'Dashed outline', text: 'Marks a cell or row with a warning. The card note and the warning text say what it is.' },
      { term: 'Not kept, n/a', text: 'The last Echo scan has no row for that pair and window, so the card has no value for the cell. E1 prints n/a.' },
    ],
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
      how: 'Type at least 2 characters, then press a result to add it. Press it again, or Remove on a chip, to take it out. Up to 8 labels. The order matters for E1, E2 and E4: the first label is the event, the second is the outcome. T1 and P1 to P4 take one label from the selection in their own list; T2, T3, T4 and the P2 rings use all of it.',
      numbers: 'The number on each result is the days the label is on, counted over every day in the export. The code, when the label has one, comes first.',
      care: 'Choosing labels tests nothing: the cards only count and draw. A pair that is not in the last Echo scan has no check. The selection is kept in memory and is lost when the page reloads.',
    },
    T1: {
      id: 'T1',
      what: 'One label over one calendar year, one square per day. The colour is the mood of the day, or whether the label is present when Colour by says so.',
      how: 'Weeks puts weekdays in rows and weeks in columns. Months puts months in rows and days of the month in columns. Year and Label pick the year and the label. Grey squares have no mood entry.',
      numbers: 'The note counts the days with the label in the year. The key lists the moods best first; each day colour is the mood of that day, which is the mean score of its entries rounded to the nearest whole score.',
      care: 'A day without a mood entry is shown as grey, not as the worst mood. The card shows one year and one label. It describes the days; it does not test whether a pattern is chance.',
    },
    T2: {
      id: 'T2',
      what: 'The selected labels as rows over the same days, with a mood band underneath.',
      how: 'Each row is a label; a tick marks a day with the label. The band is the mood of each day, coloured by the key, which lists the moods best first. Range picks how many recent days are shown.',
      numbers: 'The note lists the days present for each label over the whole export, not only the days in the range. When one pixel holds more than one day, a tick means at least one of those days has the label, and the band shows the mean mood of the group.',
      care: 'Days without entries are gaps in the band, not zeros. The rows show when labels are present; they do not show whether labels go together.',
    },
    T3: {
      id: 'T3',
      what: 'For each selected label, one row over the last 12 calendar months: bar height is how often the label is on in that month.',
      how: 'Bar height is the share of the month observed days with the label. The number beside the row is the last month count; the triangle and its number show the change against the month before. The trend word follows the slope of the bars: rising, falling or flat.',
      numbers: 'Counts and changes are days with the label. The change is the last month minus the month before, with a sign. Only observed days are counted, so a month with few entries has few days in its share.',
      care: 'A month with few observed days moves a lot when one day changes. The trend describes the 12 months; it does not test whether the change is larger than chance.',
    },
    T4: {
      id: 'T4',
      what: 'For each selected label, a rolling share: the share of observed days with the label in a window of recent observed days.',
      how: 'Each point is the share for one window. The line moves one observed day at a time as the window moves forward. Window picks the length of the window in observed days.',
      numbers: 'Values are shares of the window observed days, from 0 to 100 percent. The note lists the days present for each label over the whole export.',
      care: 'The window counts observed days, not calendar days, so a gap in the entries does not show as zero. Long series are averaged into fewer points. The card describes the data only.',
    },
    P1: {
      id: 'P1',
      what: 'Marks by weekday and clock hour, using only entries with a clock time. Rows are weekdays and columns are the 24 hours.',
      how: 'Each square is one weekday and one hour; a darker square holds more marks. All labels counts every label on an entry, so an entry with three labels adds three marks. Label picks all labels or one label from the selection; Metric picks Count or Share of marks.',
      numbers: 'Count: the marks in the square. Share: the square marks as a part of all marks in the view. The note counts the untimed entries, which are not drawn.',
      care: 'Entries without a clock time are not drawn. When most entries share one time, the note under the chart says the pattern tells little. The card does not test whether a square differs from chance.',
    },
    P2: {
      id: 'P2',
      what: 'Marks by hour of day on a 24-hour dial, using only entries with a clock time. Hour 0 is at the top, and the hours run clockwise.',
      how: 'Variant Wedges shows one label; each wedge is one hour, and a longer wedge holds more marks. Variant Rings stacks one ring per selected label. Label picks the label for Wedges.',
      numbers: 'A wedge or ring segment is the number of entries that carry the label in that hour. The note counts the untimed entries, which are not drawn.',
      care: 'Only entries with a clock time are drawn. The note under the chart about one shared time applies here too. A longer wedge is not proof of a habit; the card counts entries.',
    },
    P3: {
      id: 'P3',
      what: 'Share of observed days with the label, by weekday: one bar per weekday, with a line for the usual share over all observed days.',
      how: 'Bar height is the share of that weekday observed days that have the label. The percentage above each bar is that share. The number under each bar is the days with the label on that weekday. The weekday order starts on the first day of the week set in the time settings.',
      numbers: 'Percentage above a bar: days with the label divided by the observed days of that weekday. Number under a bar: the days with the label on that weekday. The numbers under all bars add up to the days-present figure in the note.',
      care: 'Each weekday has its own count of observed days, so a weekday with few observed days can move a lot. A taller bar describes the data; it does not show that the weekday causes anything.',
    },
    P4: {
      id: 'P4',
      what: 'Share of observed days with the label, by month of the year, with the years pooled: one bar per month, with a line for the usual share.',
      how: 'Bar height is the share of that month observed days that have the label. The percentage above each bar is that share. The number under each bar is the days with the label in that month. Each month is counted across all years in the export.',
      numbers: 'Percentage above a bar: days with the label divided by the observed days of that month, across years. Number under a bar: the days with the label in that month. The numbers under all bars add up to the days-present figure in the note.',
      care: 'Months are pooled over the years in the export, so a month can mix years with different entry counts. The card describes the data; it does not test whether a month differs from chance.',
    },
    E1: {
      id: 'E1',
      what: 'The outcomes (rows) by time window (columns) after the selected event, the first label. The values come from the last Echo scan, and only for pairs in that scan.',
      how: 'Each cell is the scan adjusted ratio for the event, the outcome and the window: 1 means no change, above 1 means the outcome is more often logged after the event, below 1 means less often. Cell colour follows the ratio. A dashed outline marks a cell with a warning. n/a means the scan has no row for that cell.',
      numbers: 'The number in a cell is the adjusted ratio of the scan row. The adjustment compares days within blocks of 30 days, counted from the first observed day, as the scan does. The note names the event.',
      care: 'The scan keeps only its strongest rows, so many pairs have no cell. A passed check is not proof that the link is real. The scan does not allow for day-to-day logging volume or weekday cycles.',
    },
    E2: {
      id: 'E2',
      what: 'The outcome rate on each day after the event, from one to several days, for the selected pair. The shaded band is what the same measure gives for events moved to other days by shuffling.',
      how: 'The horizontal axis is the days after the event. The line with dots is the outcome rate on that day. The flat line is the usual rate. A point above the shaded band is higher than the shuffled events at that day; a point inside the band is within their spread.',
      numbers: 'The vertical labels are percentages of observed days. The usual rate is the share of all observed days with the outcome. Each rate counts observed days only.',
      care: 'The band uses a fixed seed and a set number of shuffles. Where no shuffle has an event on a day, the band falls back to the usual rate. A point outside the band is a reason to look closer, not proof of a link. Gaps in the line mean no observed day at that lag.',
    },
    E4: {
      id: 'E4',
      what: 'For each outcome, the change in its share of observed days after the event compared with before it, averaged over the events.',
      how: 'Each row is one outcome. A bar to the right means the outcome is more common after the event; a bar to the left means less common. Rows are sorted by the size of the change. The window sets how many observed days are counted on each side.',
      numbers: 'The number at the end of each bar is after minus before, as a share of observed days: 0.10 is 10 percentage points. The Events count at the top is the number of events: days with the event that have a full window on both sides and no event in the days before (the gap is the number of days set in the configuration).',
      care: 'With few events the difference is unstable, and the card marks that with a warning. The window counts observed days, not calendar days. The card gives a plain difference, with no check for chance.',
    },
  },
};
