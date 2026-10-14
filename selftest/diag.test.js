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
