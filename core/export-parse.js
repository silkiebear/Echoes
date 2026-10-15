// Parse a tracker export (CSV text) into entries and day aggregates. Stats hold counts, column
// names and failure shapes, never values. Label and mood texts are registered with diag as they are
// read, so logs and diagnostics show tokens instead of the texts.
import * as diag from './diag.js';
import { parseCsv } from './csv.js';
import { aggregate } from './aggregate.js';
import { addDays } from './calendar.js';
import { viewSettings } from '../config/views.js';

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const DATE_DIGITS = 2;
const PAIR = 2;
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
// Day-first formats (groups: day, month, year). Names come from parser.extraDateFormats.
const DATE_FORMATS = {
  'DMY-dot': /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  'DMY-slash': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
};
// Column names that may be shown as they are. Anything else is shown as a shape.
const PLAIN_NAME = /^[a-z0-9_]+$/;

function shapeOf(text, maxChars) {
  return text.replace(/\d/g, '9').replace(/\p{L}/gu, 'a').slice(0, maxChars);
}

function displayName(name, cfg) {
  const plain = PLAIN_NAME.test(name) && name.length <= cfg.maxShapeChars;
  return plain ? name : `shape:${shapeOf(name, cfg.maxShapeChars)}`;
}

function normalizeHeader(raw) {
  return raw.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[ -]/g, '_');
}

function mapColumns(names, aliases) {
  const firstOf = (list) => {
    for (const alias of list) {
      const index = names.indexOf(alias);
      if (index !== -1) return index;
    }
    return -1;
  };
  const note = names.map((name, i) => (aliases.note.includes(name) ? i : -1)).filter((i) => i !== -1);
  return {
    date: firstOf(aliases.date),
    time: firstOf(aliases.time),
    mood: firstOf(aliases.mood),
    activities: firstOf(aliases.activities),
    note,
  };
}

function mappedNames(names, map) {
  const nameAt = (i) => (i === -1 ? null : names[i]);
  return {
    date: nameAt(map.date),
    time: nameAt(map.time),
    mood: nameAt(map.mood),
    activities: nameAt(map.activities),
    note: map.note.length ? map.note.map((i) => names[i]).join(',') : null,
  };
}

function validIso(year, month, day) {
  const iso = `${year}-${month.padStart(DATE_DIGITS, '0')}-${day.padStart(DATE_DIGITS, '0')}`;
  return addDays(iso, 0) === iso ? { date: iso } : { reason: 'dateInvalid' };
}

// Returns { date } or { reason } where reason is 'dateUnparsed' or 'dateInvalid'.
function parseDate(text, formatNames) {
  const iso = ISO_PATTERN.exec(text);
  if (iso) return validIso(iso[1], iso[2], iso[3]);
  for (const name of formatNames) {
    const pattern = DATE_FORMATS[name];
    if (!pattern) continue;
    const m = pattern.exec(text);
    if (m) return validIso(m[3], m[2], m[1]);
  }
  return { reason: 'dateUnparsed' };
}

// Minutes after midnight, or null when the text is not H:MM, HH:MM or HH:MM:SS within range.
function parseTime(text) {
  const m = TIME_PATTERN.exec(text);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = m[3] === undefined ? 0 : Number(m[3]);
  if (hours >= HOURS_PER_DAY || minutes >= MINUTES_PER_HOUR || seconds >= SECONDS_PER_MINUTE) return null;
  return hours * MINUTES_PER_HOUR + minutes;
}

// Records the shape of a failure once per role and shape, up to parser.maxBadShapes entries.
function noteShape(stats, cfg, role, value) {
  const entry = `${role} ${shapeOf(value, cfg.maxShapeChars)}`;
  if (stats.badShapes.length < cfg.maxBadShapes && !stats.badShapes.includes(entry)) stats.badShapes.push(entry);
}

function cellOf(row, index) {
  return index === -1 ? '' : (row[index] ?? '');
}

// Stores the text once and returns its id. Registration happens here, before any logging can see the text.
function idFor(text, ids, texts, kind) {
  let id = ids.get(text);
  if (id === undefined) {
    id = texts.length;
    ids.set(text, id);
    texts.push(text);
    diag.register(text, kind);
  }
  return id;
}

function readEntries(rows, map, cfg, stats) {
  const labelIds = new Map();
  const labelTexts = [];
  const moodIds = new Map();
  const moodNames = [];
  const entries = [];
  for (const row of rows) {
    const dateText = cellOf(row, map.date).trim();
    if (dateText === '') {
      stats.rejected.dateEmpty += 1;
      continue;
    }
    const parsed = parseDate(dateText, cfg.extraDateFormats);
    if (parsed.reason) {
      stats.rejected[parsed.reason] += 1;
      noteShape(stats, cfg, 'date', dateText);
      continue;
    }
    const timeText = cellOf(row, map.time).trim();
    const minutes = timeText === '' ? null : parseTime(timeText);
    if (timeText !== '' && minutes === null) noteShape(stats, cfg, 'time', timeText);
    const moodText = cellOf(row, map.mood).trim();
    const moods = moodText === '' ? [] : [idFor(moodText, moodIds, moodNames, 'mood')];
    const labels = [];
    for (const raw of cellOf(row, map.activities).split(cfg.activitySeparator)) {
      const text = raw.trim();
      if (text === '') continue;
      const id = idFor(text, labelIds, labelTexts, 'label');
      if (!labels.includes(id)) labels.push(id);
    }
    if (map.note.some((i) => cellOf(row, i).trim() !== '')) stats.entriesWithNote += 1;
    entries.push({ date: parsed.date, minutes, moods, labels });
  }
  return { entries, labelTexts, moodNames };
}

function labelCountSummary(entries) {
  if (entries.length === 0) return { min: 0, median: 0, max: 0 };
  const counts = entries.map((e) => e.labels.length).sort((a, b) => a - b);
  const half = Math.floor(counts.length / PAIR);
  const median = counts.length % PAIR ? counts[half] : (counts[half - 1] + counts[half]) / PAIR;
  return { min: counts[0], median, max: counts[counts.length - 1] };
}

function parseRows(text, cfg, stats) {
  const csv = parseCsv(text, cfg);
  const names = csv.header.map(normalizeHeader);
  const map = mapColumns(names, cfg.columnAliases);
  stats.columnNames = names.map((name) => displayName(name, cfg));
  stats.mapped = mappedNames(names, map);
  stats.delimiter = csv.info.delimiter;
  stats.bom = csv.info.bom;
  stats.crlf = csv.info.crlf;
  stats.lf = csv.info.lf;
  stats.quotedBreaks = csv.info.quotedBreaks;
  stats.raggedRows = csv.info.raggedRows;
  stats.rowsRead = csv.rows.length;
  if (csv.info.unterminatedQuote) {
    stats.errors.push(`unterminated quote: the last record is incomplete (${csv.rows.length} rows read)`);
  }
  if (map.date === -1) {
    stats.errors.push(`no date column; header columns: ${stats.columnNames.join(', ')}`);
    return null;
  }

  const { entries, labelTexts, moodNames } = readEntries(csv.rows, map, cfg, stats);
  const agg = aggregate(entries, viewSettings.time.dayBoundaryMinutes);
  const days = agg.days;
  stats.rowsParsed = entries.length;
  stats.entriesWithoutTime = entries.filter((e) => e.minutes === null).length;
  stats.dateMin = days.length ? days[0].date : '';
  stats.dateMax = days.length ? days[days.length - 1].date : '';
  stats.spanDays = days.length;
  stats.distinctLabels = labelTexts.length;
  stats.distinctMoods = moodNames.length;
  stats.labelsPerEntry = labelCountSummary(entries);
  return {
    labels: labelTexts.map((label, id) => ({ id, text: label })),
    moodNames,
    entries: agg.entries,
    days,
  };
}

export function parseExport(text, cfg) {
  const started = performance.now();
  const stats = {
    rowsRead: 0,
    rowsParsed: 0,
    rejected: { dateEmpty: 0, dateUnparsed: 0, dateInvalid: 0 },
    columnNames: [],
    mapped: {},
    delimiter: '',
    bom: false,
    crlf: 0,
    lf: 0,
    quotedBreaks: 0,
    raggedRows: 0,
    dateMin: '',
    dateMax: '',
    spanDays: 0,
    distinctLabels: 0,
    distinctMoods: 0,
    labelsPerEntry: { min: 0, median: 0, max: 0 },
    entriesWithoutTime: 0,
    entriesWithNote: 0,
    badShapes: [],
    errors: [],
    parseMs: 0,
  };
  let data = null;
  try {
    data = parseRows(text, cfg, stats);
  } catch {
    // The message of a caught error can carry values, so only a fixed note is kept.
    stats.errors.push('internal error: parsing stopped (no values reported)');
    data = null;
  }
  stats.parseMs = Math.round(performance.now() - started);
  return { data, stats };
}
