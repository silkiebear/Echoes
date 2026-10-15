import { test, assert } from '../core/harness.js';

import * as diag from '../core/diag.js';
import { generate } from '../core/synth.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { weekdayOf } from '../core/calendar.js';
import { parser } from '../config/parser.js';
import { synth } from '../config/synth.js';
import { viewSettings } from '../config/views.js';

const SECRET = 'ZZPRIVATEWORD';
const TARGET_BYTES = 1100000;
const NOTE_EVERY = 3;

const byDateMinutes = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.minutes - b.minutes);

function expectedEntries(gen) {
  return gen.entries
    .map((e) => ({
      date: e.date,
      minutes: e.minutes,
      day: e.day,
      labels: e.labels.map((id) => gen.labels[id].text).sort(),
    }))
    .sort(byDateMinutes);
}

function parsedEntries(data) {
  return data.entries
    .map((e) => ({
      date: e.date,
      minutes: e.minutes,
      day: data.days[e.day].date,
      labels: e.labels.map((id) => data.labels[id].text).sort(),
    }))
    .sort(byDateMinutes);
}

function checkRoundTrip(opts, delimiter, bom, crlf) {
  const gen = generate(synth);
  const { data, stats } = parseExport(exportText(synth, opts), parser);
  assert.ok(data !== null, 'data returned');
  assert.equal(stats.errors.length, 0, 'no parse errors');
  assert.equal(data.entries.length, gen.entries.length, 'same number of entries');
  assert.deepEqual(parsedEntries(data), expectedEntries(gen), 'same assigned day and labels for every entry');
  assert.deepEqual(
    data.labels.map((l) => l.text).sort(),
    gen.labels.map((l) => l.text).sort(),
    'same label texts',
  );
  const moodOfDay = new Map(gen.days.map((d) => [d.date, d.mood]));
  for (const e of data.entries) {
    const name = viewSettings.time.moodNames[moodOfDay.get(data.days[e.day].date) - 1];
    assert.equal(data.moodNames[e.moods[0]], name, 'mood name of the assigned day');
  }
  assert.equal(stats.delimiter, delimiter, 'delimiter detected');
  assert.equal(stats.bom, bom, 'byte order mark');
  assert.equal(stats.crlf > 0, crlf, 'CRLF line breaks');
}

test('round trip, style a: same labels, entries and assigned days as the generator', () => {
  checkRoundTrip({ style: 'a' }, 'comma', false, false);
});

test('round trip, style b with semicolon, BOM and CRLF: same labels, entries and assigned days', () => {
  checkRoundTrip({ style: 'b', bom: true, crlf: true }, 'semicolon', true, true);
});

test('a poisoned weekday column does not change day weekdays', () => {
  const normal = exportText(synth, {});
  const poisoned = exportText(synth, { poisonWeekday: true });
  assert.ok(normal !== poisoned, 'poison changed the text');
  const a = parseExport(normal, parser).data;
  const b = parseExport(poisoned, parser).data;
  assert.deepEqual(b.days.map((d) => d.weekday), a.days.map((d) => d.weekday), 'weekdays unchanged');
  assert.ok(b.days.every((d) => d.weekday === weekdayOf(d.date)), 'weekday matches the assigned date');
});

test('entries without a time take their calendar date', () => {
  const { data, stats } = parseExport(exportText(synth, { dropTimeEvery: 1 }), parser);
  assert.ok(data !== null, 'data returned');
  assert.ok(data.entries.every((e) => e.minutes === null && data.days[e.day].date === e.date), 'no day shift');
  assert.equal(stats.entriesWithoutTime, data.entries.length, 'every entry counted without time');
});

test('DMY-dot and DMY-slash dates are read day first', () => {
  const text = 'Date,Time,Mood,Activities\n14.10.2026,07:30,good,Late coffee F-\n15/10/2026,02:10,good,Late coffee F-\n';
  const { data, stats } = parseExport(text, parser);
  assert.ok(data !== null, 'data returned');
  assert.equal(stats.rejected.dateUnparsed + stats.rejected.dateInvalid, 0, 'no rejected dates');
  assert.deepEqual(data.entries.map((e) => data.days[e.day].date), ['2026-10-14', '2026-10-14'], 'both on 14 October');
});

test('no date column gives null data and an error with column names only', () => {
  const { data, stats } = parseExport('Foo,Bar\nTopSecretValue,1\n', parser);
  assert.equal(data, null, 'no data');
  assert.equal(stats.errors.length, 1, 'one error');
  assert.ok(stats.errors[0].includes('no date column'), 'error names the problem');
  assert.ok(stats.errors[0].includes('foo, bar'), 'error lists the column names');
  assert.ok(!JSON.stringify(stats).includes('TopSecretValue'), 'no cell value in stats');
});

test('failed dates and times are reported as shapes, not values', () => {
  const text = 'full_date,time\n14/99/2026,07:30\n2026-10-14,25:99\n2026-02-30,07:00\n';
  const { stats } = parseExport(text, parser);
  assert.equal(stats.rejected.dateInvalid, 2, 'two invalid dates');
  assert.equal(stats.rowsParsed, 1, 'one entry kept');
  assert.equal(stats.entriesWithoutTime, 1, 'the kept entry has no time');
  assert.deepEqual(
    stats.badShapes,
    ['date 99/99/9999', 'time 99:99', 'date 9999-99-99'],
    'shapes of the first failures',
  );
});

test('note text is counted, never stored', () => {
  const { data, stats } = parseExport(exportText(synth, { noteEvery: NOTE_EVERY }), parser);
  assert.ok(data !== null, 'data returned');
  assert.equal(stats.entriesWithNote, Math.floor(data.entries.length / NOTE_EVERY), 'entries with a note counted');
  assert.ok(!JSON.stringify(data).includes('Felt'), 'note text not stored');
});

test('a forced failure and a normal parse never show a registered string', () => {
  const normal = [
    'full_date,time,mood,activities,note',
    `2026-10-14,07:30,${SECRET},${SECRET} Walk A+|Coffee F-,"line one, ""quoted""`,
    `2026-10-15,08:00,good,Coffee F-,"${SECRET} second`,
    `line"`,
  ].join('\n') + '\n';
  const parsed = parseExport(normal, parser);
  assert.ok(parsed.data !== null, 'normal parse returns data');
  assert.ok(!JSON.stringify(parsed.stats).toUpperCase().includes(SECRET), 'stats hold no label or mood text');

  const broken = `full_date,time,mood,activities\n2026-10-14,07:30,${SECRET},"${SECRET} Walk A+|Coffee F-\n`;
  let thrown = null;
  let forced = null;
  try {
    forced = parseExport(broken, parser);
  } catch (err) {
    thrown = err;
  }
  assert.equal(thrown, null, 'parseExport does not throw');
  assert.ok(forced.stats.errors.length > 0, 'unterminated quote reported');
  assert.ok(!JSON.stringify(forced.stats).toUpperCase().includes(SECRET), 'forced failure stats hold no text');
  diag.setParseStats(forced.stats);
  const report = diag.build({ includeData: false });
  assert.ok(!report.toUpperCase().includes(SECRET), 'diagnostics show no registered text');
});

test('a 1.1 MB export parses within the Node time budget', () => {
  const probe = exportText(synth, { noteEvery: NOTE_EVERY });
  const days = Math.ceil((TARGET_BYTES / probe.length) * synth.days);
  const text = exportText({ ...synth, days }, { noteEvery: NOTE_EVERY });
  assert.ok(text.length > TARGET_BYTES * 0.9, `export is ${text.length} characters`);
  const started = performance.now();
  const { data } = parseExport(text, parser);
  const elapsed = performance.now() - started;
  assert.ok(data !== null, 'data returned');
  assert.ok(elapsed < parser.maxParseMsNode, `took ${Math.round(elapsed)} ms`);
});
