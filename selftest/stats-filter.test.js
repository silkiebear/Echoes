// Self-tests for the label filter (phase 4b, tier 4b.4): pure matching, the engine output stage, and privacy.
import { test, assert } from '../core/harness.js';
import * as diag from '../core/diag.js';
import { normalizeFilter, matchesFilter } from '../core/stats/label-filter.js';
import { runScan } from '../core/stats/run.js';
import { generateWide } from '../core/synth-wide.js';
import { defaultSettings } from '../core/settings.js';
import { statsSynth } from '../config/stats-synth.js';
import { stats } from '../config/stats.js';

const MIN = stats.ui.filterMinChars;
const FILLERS = 20;
// Every row is kept, so the filtered and unfiltered runs can be compared row by row.
const CFG = { ...stats, keepTop: 100000 };

test('normalizeFilter trims, folds case and keeps the role', () => {
  assert.deepEqual(normalizeFilter({ text: '  PlAnT ', role: 'exposure' }, MIN), { text: 'plant', role: 'exposure' }, 'folded');
});

test('normalizeFilter gives no filter for text shorter than the minimum after trim', () => {
  assert.equal(normalizeFilter({ text: ' a ', role: 'either' }, MIN), null, 'short text is no filter');
});

test('normalizeFilter falls back to role either for an unknown role', () => {
  assert.equal(normalizeFilter({ text: 'ab', role: 'other' }, MIN).role, 'either', 'unknown role');
});

test('matchesFilter ignores case', () => {
  assert.ok(matchesFilter({ exposure: 'Plant up X', outcome: 'Y' }, normalizeFilter({ text: 'PLANT' }, MIN)), 'case');
});

test('matchesFilter compares NFC spellings', () => {
  // Label "été" written with a composed e-acute; the filter text is the decomposed spelling of the same letters.
  assert.ok(matchesFilter({ exposure: '\u00e9t\u00e9', outcome: 'x' }, normalizeFilter({ text: 'e\u0301t' }, MIN)), 'NFC');
});

test('matchesFilter with role exposure looks only at the exposure label', () => {
  assert.ok(!matchesFilter({ exposure: 'x', outcome: 'plant' }, normalizeFilter({ text: 'plant', role: 'exposure' }, MIN)), 'exposure only');
});

test('matchesFilter with role outcome looks only at the outcome label', () => {
  assert.ok(matchesFilter({ exposure: 'x', outcome: 'plant' }, normalizeFilter({ text: 'plant', role: 'outcome' }, MIN)), 'outcome only');
});

test('matchesFilter reports no match when neither label contains the text', () => {
  assert.ok(!matchesFilter({ exposure: 'sleep', outcome: 'food' }, normalizeFilter({ text: 'plant' }, MIN)), 'no match');
});

test('matchesFilter with no filter matches every row', () => {
  assert.ok(matchesFilter({ exposure: 'a', outcome: 'b' }, null), 'no filter');
});

test('the filter keeps only matching rows, and their q values equal the unfiltered run', async () => {
  const data = generateWide(statsSynth, statsSynth.seed, FILLERS);
  const input = { data, settings: defaultSettings() };
  const plain = await runScan(input, { mode: 'fast', cfg: CFG }, {});
  const text = 'plant';
  const filtered = await runScan(input, { mode: 'fast', cfg: CFG, labelFilter: { text, role: 'either' } }, {});
  const matchesText = (r) => [r.exposure, r.outcome].some((id) => data.labels[id].text.toLowerCase().includes(text));
  const expected = plain.rows.filter(matchesText);
  assert.equal(filtered.rows.length, expected.length, 'row count equals the matching unfiltered rows');
  assert.ok(filtered.rows.every(matchesText), 'every kept row matches the filter');
  const qOf = new Map(plain.rows.map((r) => [`${r.exposure}:${r.outcome}:${r.window}`, r.q]));
  assert.ok(filtered.rows.every((r) => qOf.get(`${r.exposure}:${r.outcome}:${r.window}`) === r.q), 'q values unchanged');
});

test('the filter count is in meta, and family stays the full tested count', async () => {
  const data = generateWide(statsSynth, statsSynth.seed, FILLERS);
  const input = { data, settings: defaultSettings() };
  const plain = await runScan(input, { mode: 'fast', cfg: CFG }, {});
  const filtered = await runScan(input, { mode: 'fast', cfg: CFG, labelFilter: { text: 'plant', role: 'either' } }, {});
  assert.equal(filtered.meta.filtered, filtered.rows.length, 'filtered counts the rows before the cut');
  assert.equal(filtered.meta.family, plain.meta.family, 'family is the full tested count');
});

test('a short filter text changes nothing: no filtered count and the same rows', async () => {
  const data = generateWide(statsSynth, statsSynth.seed, FILLERS);
  const input = { data, settings: defaultSettings() };
  const plain = await runScan(input, { mode: 'fast', cfg: CFG }, {});
  const short = await runScan(input, { mode: 'fast', cfg: CFG, labelFilter: { text: 'p', role: 'either' } }, {});
  assert.equal(short.meta.filtered, null, 'no filter, so no count');
  assert.equal(short.rows.length, plain.rows.length, 'same row count');
});

test('privacy: the filter text is absent from the result and from the diagnostics with data sections off', async () => {
  const token = 'ZZFILTERWORD';
  const data = generateWide(statsSynth, statsSynth.seed, FILLERS);
  const result = await runScan({ data, settings: defaultSettings() }, { mode: 'fast', labelFilter: { text: token, role: 'either' } }, {});
  assert.ok(!JSON.stringify(result).includes(token), 'result carries the filter text');
  assert.ok(!diag.build({ includeData: false }).includes(token), 'diagnostics carry the filter text');
});
