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
