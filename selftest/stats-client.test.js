// Scan client with an injected worker factory: construction error, normal result path, cancel, error before the first
// message, and a fixed error code. Runs in Node and in the browser (no real Worker is created here).
import { test, assert } from '../core/harness.js';
import { startScan } from '../core/stats/client.js';
import { generateWide } from '../core/synth-wide.js';
import { defaultSettings } from '../core/settings.js';
import { statsSynth } from '../config/stats-synth.js';
import { stats } from '../config/stats.js';

const SMALL_FILLERS = 5;

function fakeWorker(script) {
  const w = { posted: [], terminated: false, onmessage: null, onerror: null };
  w.postMessage = (msg) => {
    w.posted.push(msg);
    script(w, msg);
  };
  w.terminate = () => { w.terminated = true; };
  return w;
}

function smallInput() {
  return { data: generateWide(statsSynth, statsSynth.seed, SMALL_FILLERS), settings: defaultSettings() };
}

test('client: a worker that cannot be created falls back to the main thread (runner main)', async () => {
  const handle = startScan(smallInput(), { mode: 'fast' }, {}, () => { throw new Error('no worker'); });
  const result = await handle.done;
  assert.equal(result.meta.runner, 'main', 'runner');
  assert.ok(Array.isArray(result.rows), 'rows');
});

test('client: a worker error before the first message falls back to the main thread', async () => {
  const handle = startScan(smallInput(), { mode: 'fast' }, {}, () => fakeWorker((w, msg) => {
    if (msg.type === 'start' && w.onerror) w.onerror({});
  }));
  const result = await handle.done;
  assert.equal(result.meta.runner, 'main', 'runner');
});

test('client: normal result path passes progress through and terminates the worker', async () => {
  const seen = [];
  let worker = null;
  const handle = startScan({ data: null, settings: null }, { mode: 'fast' }, { progress: (s, f) => seen.push([s, f]) }, () => {
    worker = fakeWorker((w, msg) => {
      if (msg.type !== 'start') return;
      w.onmessage({ data: { type: 'progress', stage: 'scan', fraction: 0.5 } });
      w.onmessage({ data: { type: 'result', result: { meta: { runner: 'worker', cancelled: false }, rows: [], notices: [] } } });
    });
    return worker;
  });
  const result = await handle.done;
  assert.equal(result.meta.runner, 'worker', 'runner');
  assert.deepEqual(seen, [['scan', 0.5]], 'progress');
  assert.equal(worker.terminated, true, 'terminated');
  assert.equal(worker.posted[0].options.runner, 'worker', 'start carries the worker runner');
});

test('client: cancel posts a cancel message and resolves with the cancelled result', async () => {
  let worker = null;
  const handle = startScan({ data: null, settings: null }, { mode: 'fast' }, {}, () => {
    worker = fakeWorker((w, msg) => {
      if (msg.type === 'cancel') w.onmessage({ data: { type: 'result', result: { meta: { cancelled: true }, rows: [], notices: [] } } });
    });
    return worker;
  });
  handle.cancel();
  const result = await handle.done;
  assert.equal(result.meta.cancelled, true, 'cancelled');
  assert.equal(worker.posted[worker.posted.length - 1].type, 'cancel', 'cancel message sent');
});

test('client: an error message resolves with the fixed error code only', async () => {
  const handle = startScan({ data: null, settings: null }, { mode: 'fast' }, {}, () => fakeWorker((w, msg) => {
    if (msg.type === 'start') w.onmessage({ data: { type: 'error', code: stats.worker.scanFailed } });
  }));
  const result = await handle.done;
  assert.deepEqual(result, { error: stats.worker.scanFailed }, 'error code');
});
