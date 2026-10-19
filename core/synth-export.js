// Build a synthetic tracker-style CSV text from the synthetic generator.
// Nothing here is real data; it exists for tests and a command-line tool.

import { generate } from './synth.js';
import { weekdayOf } from './calendar.js';
import { viewSettings } from '../config/views.js';

// Tunables kept out of the code below.
const WEEKDAY_COUNT = 7;
const MINUTES_PER_HOUR = 60;
const POISON_STEP = 1;

// Weekday names, Sunday first (index 0).
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Exact note text used when noteEvery applies. The comma, quotes and the
// embedded LF are all part of the value.
const NOTE_TEXT = 'Felt "fine",\nslept well';

// Two-digit zero padding for the time cell.
function pad2(n) {
  return String(n).padStart(2, '0');
}

// Wrap a cell in quotes when it holds the delimiter, a quote or a line break; double inner quotes.
function quoteCell(value, delimiter) {
  if (value.includes(delimiter) || /["\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function exportText(synthCfg, opts = {}) {
  const style = opts.style ?? 'a';
  const bom = opts.bom === true;
  const crlf = opts.crlf === true;
  const delimiter = opts.delimiter || (style === 'b' ? ';' : ',');
  const dropTimeEvery = opts.dropTimeEvery || 0;
  const noteEvery = opts.noteEvery || 0;
  // Poisoning only affects style a.
  const poisonWeekday = opts.poisonWeekday === true && style === 'a';

  const lineBreak = crlf ? '\r\n' : '\n';

  const { labels, days, entries } = generate(synthCfg);

  // Look up the assigned day by its date, and label id by its text.
  const dayByDate = new Map();
  for (const d of days) {
    dayByDate.set(d.date, d);
  }
  const labelTextById = new Map();
  for (const l of labels) {
    labelTextById.set(l.id, l.text);
  }

  // Mood name comes from the assigned day's mood score: the names are best first, so score s is the name at n - s.
  function moodNameForDay(day) {
    const names = viewSettings.time.moodNames;
    return names[names.length - day.mood];
  }

  // Label texts for an entry, in entry.labels order, joined with '|'.
  function activitiesFor(entry) {
    return entry.labels.map((id) => labelTextById.get(id)).join('|');
  }

  // 'HH:MM' from minutes past midnight.
  function timeStr(minutes) {
    const h = Math.floor(minutes / MINUTES_PER_HOUR);
    const m = minutes % MINUTES_PER_HOUR;
    return pad2(h) + ':' + pad2(m);
  }

  const headerCells =
    style === 'b'
      ? ['Full Date', 'Time', 'Mood', 'Activities', 'Note']
      : [
          'full_date',
          'date',
          'weekday',
          'time',
          'mood',
          'activities',
          'note_title',
          'note',
        ];

  const rows = [headerCells.map((c) => quoteCell(c, delimiter)).join(delimiter)];

  entries.forEach((entry, i) => {
    const day = dayByDate.get(entry.day);
    const mood = moodNameForDay(day);
    const acts = activitiesFor(entry);

    let timeCell = timeStr(entry.minutes);
    if (dropTimeEvery && (i + 1) % dropTimeEvery === 0) {
      timeCell = '';
    }

    let noteCell = '';
    if (noteEvery && (i + 1) % noteEvery === 0) {
      noteCell = NOTE_TEXT;
    }

    let weekdayCell = '';
    if (style === 'a') {
      const idx = weekdayOf(entry.date);
      weekdayCell = poisonWeekday
        ? WEEKDAYS[(idx + POISON_STEP) % WEEKDAY_COUNT]
        : WEEKDAYS[idx];
    }

    const cells =
      style === 'b'
        ? [entry.date, timeCell, mood, acts, noteCell]
        : [entry.date, entry.day, weekdayCell, timeCell, mood, acts, '', noteCell];

    rows.push(cells.map((c) => quoteCell(c, delimiter)).join(delimiter));
  });

  const body = rows.join(lineBreak) + lineBreak;
  return (bom ? '\uFEFF' : '') + body;
}
