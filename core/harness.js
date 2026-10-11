// Minimal test runner for Node and the browser (no node: imports).
// Test files call test() or skip() at import time; runAll() collects what each file registered.

const fileCache = new Map(); // module URL -> { tests } or { error }
let collecting = null;

function errorText(err) {
  return err && err.message ? err.message : String(err);
}

function show(value) {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function sameShape(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && sameShape(a[key], b[key]));
}

export const assert = {
  ok(value, msg = 'expected a truthy value') {
    if (!value) throw new Error(msg);
  },
  equal(actual, expected, msg = 'values differ') {
    if (!Object.is(actual, expected)) {
      throw new Error(`${msg}: expected ${show(expected)}, got ${show(actual)}`);
    }
  },
  deepEqual(actual, expected, msg = 'structures differ') {
    if (!sameShape(actual, expected)) {
      throw new Error(`${msg}: expected ${show(expected)}, got ${show(actual)}`);
    }
  },
  throws(fn, pattern, msg = 'expected a throw') {
    let caught = null;
    try {
      fn();
    } catch (err) {
      caught = err;
    }
    if (!caught) throw new Error(msg);
    if (pattern) {
      const text = errorText(caught);
      const hit = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
      if (!hit) throw new Error(`${msg}: wrong error "${text}"`);
    }
    return caught;
  },
};

function record(entry) {
  if (collecting) collecting.push(entry);
}

export function test(name, fn) {
  record({ name, fn });
}

export function skip(name, reason = 'skipped') {
  record({ name, fn: null, reason });
}

async function loadFile(href) {
  if (!fileCache.has(href)) {
    const previous = collecting;
    collecting = [];
    try {
      await import(href);
      fileCache.set(href, { tests: collecting });
    } catch (err) {
      fileCache.set(href, { error: errorText(err) });
    } finally {
      collecting = previous;
    }
  }
  return fileCache.get(href);
}

async function runOne(file, entry) {
  if (entry.fn === null) return { file, name: entry.name, status: 'skip', reason: entry.reason };
  const start = performance.now();
  try {
    await entry.fn();
    return { file, name: entry.name, status: 'pass', ms: performance.now() - start };
  } catch (err) {
    return { file, name: entry.name, status: 'fail', error: errorText(err), ms: performance.now() - start };
  }
}

export async function runAll(fileList, baseUrl) {
  const results = [];
  for (const file of fileList) {
    const loaded = await loadFile(new URL(file, baseUrl).href);
    if (loaded.error) {
      results.push({ file, name: '(import)', status: 'fail', error: loaded.error });
      continue;
    }
    for (const entry of loaded.tests) results.push(await runOne(file, entry));
  }
  const count = (status) => results.filter((r) => r.status === status).length;
  return { passed: count('pass'), failed: count('fail'), skipped: count('skip'), results };
}
