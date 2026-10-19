// Texts and tunables for the E views on your data (phase 4d, 4d.4). Descriptive only: a check for chance is shown only for a
// pair that is in the last Echo scan result. New file: config\explore.js is not on the 4d.4 list.
export const exploreEcho = {
  // Choice: at most this many outcomes in E1 and E4 (the other selected labels, in selection order), so the matrix and the
  // rows stay readable on a phone.
  maxOutcomes: 8,
  ui: {
    e1: {
      heading: 'E1 Echo matrix',
      note: 'Outcomes by time window after the event {event}. Each cell is the adjusted rate ratio of the last Echo scan. A blank cell was not kept by that scan. Descriptive only.',
    },
    e2: {
      heading: 'E2 Echo curve',
      note: 'Outcome rate on each day after the event {event}, for {outcome}. The shaded band comes from shuffled events. Descriptive only.',
      caption: 'days after the event; shaded band: the same rate after {shuffles} shuffled events (a placebo band, fixed seed)',
      desc: 'Outcome rate by days after the event, with a band from shuffled events',
    },
    e4: {
      heading: 'E4 Before and after',
      note: 'Share of observed days with each outcome in the {window} observed days before and after each day with the event {event}. Descriptive only.',
    },
    noTwo: 'Choose two labels above. The first is the event by default; the others are the outcomes (E2 takes one outcome).',
    noScan: 'No Echo scan result for this data. Run the scan in Data to check the pairs.',
    staleScan: 'The last Echo scan was run on other data. Run it again in Data.',
    inScan: 'Check for chance from the last scan: {verdict}',
    notInScan: 'This pair is not in the last scan result, so no check for chance is available. The scan keeps only its strongest rows.',
    noEvents: 'No observed day with the event {event}.',
    noRowsForEvent: 'The last scan has no row with the event {event}, so E1 has no cells to show.',
    pairButton: 'Select this pair in Explore',
    pairNoData: 'Load your export to select a pair.',
  },
};
