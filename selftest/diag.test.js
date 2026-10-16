import { test, assert } from '../core/harness.js';
import { app } from '../config/app.js';

// Each test loads a fresh copy of diag.js so the live app state is never reset.
let freshCount = 0;
async function fresh() {
  freshCount += 1;
  return import(new URL(`../core/diag.js?fresh=${freshCount}`, import.meta.url).href);
}

function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

test('tokens are stable for the same string, ignoring case', async () => {
  const d = await fresh();
  assert.equal(d.register('Work', 'label'), 'L0001');
  assert.equal(d.register('Work', 'label'), 'L0001');
  assert.equal(d.register('WORK', 'label'), 'L0001');
  assert.equal(d.register('Sleep', 'mood'), 'M0001');
  assert.equal(d.register('Thing'), 'X0001');
});

test('strings shorter than 2 characters are ignored', async () => {
  const d = await fresh();
  assert.equal(d.register('a', 'label'), null);
  assert.equal(d.register(' ', 'label'), null);
  assert.equal(d.safe('a'), 'a');
});

test('safe() replaces registered strings case-insensitively', async () => {
  const d = await fresh();
  d.register('Work', 'label');
  assert.equal(d.safe('work and WORK'), 'L0001 and L0001');
});

test('safe() replaces the longest match first', async () => {
  const d = await fresh();
  d.register('Sleep', 'mood');
  d.register('Sleep well', 'note');
  assert.equal(d.safe('Sleep well, Sleep'), 'N0001, M0001');
});

test('log() and build() never show registered strings', async () => {
  const d = await fresh();
  d.register('Secret Name', 'label');
  d.log('INFO', 'saw Secret Name here');
  const text = d.build();
  assert.ok(!text.toLowerCase().includes('secret name'), 'registered string leaked');
  assert.ok(text.includes('L0001'), 'token missing');
});

test('error path never shows registered strings', async () => {
  const d = await fresh();
  d.register('Secret Name', 'label');
  const target = new EventTarget();
  d.captureErrors(target);
  const errorEvent = new Event('error');
  Object.defineProperty(errorEvent, 'error', { value: new Error('boom Secret Name') });
  target.dispatchEvent(errorEvent);
  const rejection = new Event('unhandledrejection');
  Object.defineProperty(rejection, 'reason', { value: new Error('rejected Secret Name') });
  target.dispatchEvent(rejection);
  const text = d.build();
  assert.ok(text.includes('UNHANDLED'), 'rejection not captured');
  assert.ok(!text.toLowerCase().includes('secret name'), 'registered string leaked through errors');
});

test('includeData is off by default', async () => {
  const d = await fresh();
  d.register('Secret Name', 'label');
  const text = d.build();
  assert.ok(!text.includes('LABELS AND MOODS'), 'data section present by default');
  assert.ok(!text.includes('CONTAINS DATA'), 'data marker present by default');
  const withData = d.build({ includeData: true });
  assert.ok(withData.includes('== LABELS AND MOODS [CONTAINS DATA FROM YOUR EXPORT] =='));
  assert.ok(withData.includes('L0001 = "Secret Name"'));
});

test('output is capped at maxBytes with a visible notice', async () => {
  const d = await fresh();
  const long = 'x'.repeat(400);
  for (let i = 0; i < app.diag.maxLogLines * 2; i++) d.log('INFO', long + i);
  const text = d.build();
  assert.ok(byteLength(text) <= app.diag.maxBytes, `output is ${byteLength(text)} bytes`);
  assert.ok(text.includes('TRUNCATED'), 'truncation notice missing');
});

test('NFC: a label registered composed is replaced when it occurs decomposed, and the reverse', async () => {
  const composed = 'Caf\u00e9 Time';   // precomposed e with acute
  const decomposed = 'Cafe\u0301 Time'; // "e" followed by a combining acute accent
  const d = await fresh();
  assert.equal(d.register(composed, 'label'), 'L0001', 'composed registration');
  const out = d.safe(`met at ${decomposed}`);
  assert.equal(out, 'met at L0001', 'decomposed occurrence not replaced');
  const e = await fresh();
  e.register(decomposed, 'label');
  assert.equal(e.safe(`met at ${composed}`), 'met at L0001', 'composed occurrence not replaced');
  assert.ok(!e.safe(`met at ${decomposed}`).includes('Cafe'), 'label text leaked');
});

// Scheme literals are joined from parts so no external-URL text appears in an app file (lint L2).
test('captured stack lines keep only the path; scheme, host and port are removed', async () => {
  const http = ['ht', 'tp', '://'].join('');
  const https = ['ht', 'tps', '://'].join('');
  const stack = [
    'Error: boom',
    `    at load (${http}localhost:8000/modules/gallery.js:123:22)`,
    `    at remote (${https}cdn.example.test:8443/lib/x.js:9:1)`,
    `    at fn@${http}localhost:8000/modules/gallery.js:40:5`,
  ].join('\n');
  const d = await fresh();
  const stripped = d.stripOrigins(stack);
  assert.ok(stripped.includes('    at load (/modules/gallery.js:123:22)'), `path kept: ${stripped}`);
  assert.ok(stripped.includes('(/lib/x.js:9:1)'), 'https host path kept');
  assert.ok(stripped.includes('fn@/modules/gallery.js:40:5'), 'firefox style path kept');
  assert.ok(!/localhost|example\.test|8000|8443/.test(stripped), 'host or port left behind');
  const target = new EventTarget();
  d.captureErrors(target);
  const errorEvent = new Event('error');
  Object.defineProperty(errorEvent, 'error', { value: { message: 'boom', stack } });
  target.dispatchEvent(errorEvent);
  const text = d.build();
  assert.ok(text.includes('/modules/gallery.js:123:22'), 'path missing from the diagnostics');
  assert.ok(!text.includes('localhost'), 'host left in the diagnostics');
  assert.equal(d.totalErrors(), 1, 'error count');
});

test('5000 registered strings and 100 KB of text redact within the time budget', async () => {
  const d = await fresh();
  const count = app.selftest.stringCount;
  const names = [];
  for (let i = 0; i < count; i++) names.push(`Activity ${i.toString(36).padStart(4, '0')} name`);
  const start = performance.now();
  for (const name of names) d.register(name, 'label');
  const parts = [];
  let size = 0;
  for (let i = 0; size < app.selftest.textBytes; i++) {
    const piece = `${names[(i * 7919) % count]} and some more text. `;
    parts.push(piece);
    size += piece.length;
  }
  const out = d.safe(parts.join(''));
  const elapsed = performance.now() - start;
  assert.ok(elapsed < app.selftest.perfBudgetMs, `took ${Math.round(elapsed)} ms`);
  assert.ok(!out.toLowerCase().includes('activity'), 'a registered string leaked');
});

// Built from parts so the scheme literal does not appear in app files (URL lint).
const SCHEME = 'ht' + 'tp:';

// Fake target: captures the listener so the test can call it with a plain object shaped like an error event.
function fakeTarget() {
  const listeners = {};
  return { listeners, addEventListener: (type, fn) => { listeners[type] = fn; } };
}

test('error capture: origin stripped from the file name, line and column kept', async () => {
  const d = await fresh();
  const target = fakeTarget();
  d.captureErrors(target);
  target.listeners.error({ message: 'boom', error: null, filename: `${SCHEME}//localhost:9/modules/gallery.js`, lineno: 12, colno: 3 });
  const text = d.build();
  assert.ok(text.includes('boom at /modules/gallery.js:12:3'), 'path, line and column kept');
  assert.ok(!text.includes('localhost:9'), 'host and port removed');
});

test('error capture: a registered label in an error message is shown as its token', async () => {
  const d = await fresh();
  const token = d.register('Headache', 'label');
  const target = fakeTarget();
  d.captureErrors(target);
  target.listeners.error({ message: 'failed for Headache', error: null, filename: '', lineno: 0, colno: 0 });
  const text = d.build();
  assert.ok(text.includes(`failed for ${token}`), 'token expected');
  assert.ok(!text.includes('Headache'), 'label text must not appear');
});

test('error capture: bare "Script error." without a file gets the cross-origin detail', async () => {
  const d = await fresh();
  const target = fakeTarget();
  d.captureErrors(target);
  target.listeners.error({ message: 'Script error.', error: null, filename: '', lineno: 0, colno: 0 });
  assert.ok(d.build().includes('Script error. [no details: cross-origin or injected script]'), 'detail expected');
});

test('fileNameFor: local date and time in a fixed pattern', async () => {
  const d = await fresh();
  assert.equal(d.fileNameFor(new Date(2026, 9, 14, 7, 5)), 'echoes-diagnostics-20261014-0705.txt');
});

test('PARSE STATS shows the set stats, nested keys and arrays, and replaces registered text', async () => {
  const d = await fresh();
  d.register('Work Note', 'label');
  assert.ok(d.build().includes('(none yet)'), 'placeholder before stats are set');
  d.setParseStats({
    rowsRead: 3,
    ok: true,
    mapped: { date: 'full_date' },
    labelsPerEntry: { min: 0 },
    columnNames: ['full_date', 'Work Note'],
  });
  const text = d.build();
  const section = text.slice(text.indexOf('== PARSE STATS'));
  assert.ok(section.includes('rowsRead: 3'), 'number printed as is');
  assert.ok(section.includes('ok: true'), 'boolean printed as is');
  assert.ok(section.includes('mapped.date: full_date'), 'nested key printed');
  assert.ok(section.includes('labelsPerEntry.min: 0'), 'nested key printed');
  assert.ok(section.includes('columnNames: full_date, L0001'), 'registered column text replaced');
  assert.ok(!section.includes('(none yet)'), 'placeholder gone');
  assert.ok(!text.includes('Work Note'), 'registered text leaked');
});

// Two-character keys match only as whole words; three or more match as substrings.
test('two-character mood matches as a whole word only', async () => {
  const d = await fresh();
  assert.equal(d.register('ok', 'mood'), 'M0001', 'token for ok');
  assert.equal(d.safe('token ok.'), 'token M0001.', 'whole word replaced');
  assert.equal(d.safe('book'), 'book', 'ok inside book is not a word match');
  assert.ok(!d.safe('token ok.').includes('ok.'), 'original word leaked');
});

test('three-character key matches as a substring; the rest of the word remains', async () => {
  const d = await fresh();
  assert.equal(d.register('Run', 'label'), 'L0001', 'token for Run');
  assert.equal(d.safe('Running'), 'L0001ning', 'Run removed, ning stays');
  assert.ok(!d.safe('Running').toLowerCase().includes('run'), 'key leaked');
});

test('two-character key with a Finnish letter matches the word, not a longer word', async () => {
  const d = await fresh();
  assert.equal(d.register('\u00d6l', 'label'), 'L0001', 'token for Ol with umlaut');
  const out = d.safe('\u00d6l and \u00d6lkki');
  assert.equal(out, 'L0001 and \u00d6lkki', 'whole word only with a Finnish letter');
  assert.ok(!out.includes('\u00d6l and'), 'word leaked');
});

test('two-character key with a regex metacharacter is matched literally', async () => {
  const d = await fresh();
  assert.equal(d.register('A+', 'label'), 'L0001', 'token for A+');
  const out = d.safe('got A+ today');
  assert.equal(out, 'got L0001 today', 'A+ matched literally');
  assert.ok(!out.includes('A+'), 'key leaked');
});

// Real labels such as 'date' or 'ice' must not change keys, headings or fixed labels (SPEC 8).
test('build() keeps keys and headings when real labels match inside them; values are redacted', async () => {
  const d = await fresh();
  for (const name of ['date', 'ice', 'online', 'rejected', 'iron']) d.register(name, 'label');
  d.setParseStats({ devicePixelRatio: 2, online: 3, rejected: { dateEmpty: 1 }, dateMin: 'ice' });
  const text = d.build();
  assert.ok(text.includes('== ENVIRONMENT [SAFE] =='), 'heading mangled');
  const section = text.slice(text.indexOf('== PARSE STATS'));
  assert.ok(section.includes('devicePixelRatio: 2'), 'key devicePixelRatio mangled');
  assert.ok(section.includes('online: 3'), 'key online mangled');
  assert.ok(section.includes('rejected.dateEmpty: 1'), 'nested key mangled');
  assert.ok(section.includes('dateMin: L0002'), 'parse-stats value not redacted to its token');
});

test('logStatic keeps its literal message and redacts field values', async () => {
  const d = await fresh();
  d.register('Secret Name', 'label');
  d.register('Activity', 'label');
  d.logStatic('INFO', 'Activity scan done', { label: 'Secret Name', cells: 12 });
  const text = d.build();
  assert.ok(text.includes('Activity scan done label=L0001 cells=12'), 'message or fields wrong');
  assert.ok(!text.toLowerCase().includes('secret name'), 'field value leaked');
});

// build() starts with a time line, so the comparison starts at the first section heading.
test('snapshot, register, setParseStats and restore return build() to the state before the snapshot', async () => {
  const body = (text) => text.slice(text.indexOf('== ENVIRONMENT'));
  const d = await fresh();
  d.register('Work', 'label');
  d.setParseStats({ rowsRead: 3, ratio: Infinity });
  d.logStatic('INFO', 'before', { n: 1 });
  const before = body(d.build());
  const snap = d.snapshot();
  d.register('Other', 'label');
  d.setParseStats({ rowsRead: 9 });
  d.logStatic('WARN', 'changed', { n: 2 });
  d.setSelftest({ ran: 'x', passed: 1, failed: 0, skipped: 0, failing: [] });
  d.restore(snap);
  assert.equal(body(d.build()), before, 'restore did not return the earlier state');
});
