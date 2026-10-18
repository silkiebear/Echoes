// ENVIRONMENT values are printed as they are; the other blocks keep redaction (SPEC 8, phase 4a U5). Its own file
// because diag.test.js is near the line limit. Each test loads a fresh copy of diag.js (as diag.test.js does).
// The query key differs from diag.test.js ("fresh"): an equal URL returns the same module instance, so the registry
// of one file leaked into the other (found in phase 4c).
import { test, assert } from '../core/harness.js';
import { describeEnvironment } from '../core/env.js';

let freshCount = 0;
async function fresh() {
  freshCount += 1;
  return import(new URL(`../core/diag.js?envfresh=${freshCount}`, import.meta.url).href);
}

function section(text, name) {
  const start = text.indexOf(`== ${name}`);
  const end = text.indexOf('\n== ', start + 1);
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

test('ENVIRONMENT: every value is printed as it is, even when a registered string occurs inside it', async () => {
  const env = describeEnvironment();
  const probe = env.userAgent.slice(0, 4);
  assert.equal(probe.length, 4, 'user agent shorter than 4 characters');
  const d = await fresh();
  d.register(probe, 'label');
  const block = section(d.build(), 'ENVIRONMENT');
  for (const [key, value] of Object.entries(env)) {
    assert.ok(block.includes(`${key}: ${value}`), `${key} changed: ${value}`);
  }
  assert.ok(block.includes(`userAgent: ${env.userAgent}`), 'user agent changed');
});

test('LOG: the same registered string is a token in a log field', async () => {
  const probe = describeEnvironment().userAgent.slice(0, 4);
  const d = await fresh();
  const token = d.register(probe, 'label');
  d.logStatic('INFO', 'env probe', { text: probe });
  const log = section(d.build(), 'LOG');
  assert.ok(log.includes(`text=${token}`), 'log field not replaced by its token');
  assert.ok(!log.includes(`text=${probe}`), 'log field shows the registered string');
});

function registeredCount(text) {
  const match = /registeredStrings: (\d+)/.exec(section(text, 'PARSE STATS'));
  return match ? Number(match[1]) : null;
}

test('PARSE STATS: registeredStrings is the registry size as a number, on the last line', async () => {
  const d = await fresh();
  d.register('Alpha', 'label');
  d.register('Beta', 'label');
  d.register('Gamma', 'mood');
  const text = d.build();
  assert.equal(registeredCount(text), 3, 'registeredStrings not 3');
  const lines = section(text, 'PARSE STATS').trim().split('\n');
  assert.ok(lines[lines.length - 1].startsWith('registeredStrings: '), `last line is ${lines[lines.length - 1]}`);
});

test('PARSE STATS: snapshot and restore give back the same registry count', async () => {
  const d = await fresh();
  d.register('Alpha', 'label');
  d.register('Beta', 'label');
  const snap = d.snapshot();
  d.register('Delta', 'label');
  assert.equal(registeredCount(d.build()), 3, 'count after a new registration');
  d.restore(snap);
  assert.equal(registeredCount(d.build()), 2, 'count after restore');
});

test('ENVIRONMENT: a registered string equal to an environment key name leaves the key unchanged', async () => {
  const env = describeEnvironment();
  const d = await fresh();
  for (const key of Object.keys(env)) d.register(key, 'label');
  const block = section(d.build(), 'ENVIRONMENT');
  for (const key of Object.keys(env)) {
    assert.ok(block.includes(`${key}: `), `key ${key} was replaced`);
  }
});
