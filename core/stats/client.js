// Scan client (decision D10 runtime). Runs the scan in a module worker and falls back to the main thread when the worker
// cannot be created or fails before its first message. Both paths resolve `done` with the same result shape. Errors
// resolve with { error: code } and a fixed code; no text from the data reaches the caller.
import { runScan } from './run.js';
import { stats } from '../../config/stats.js';

const WORKER_RUNNER = 'worker';
const MAIN_RUNNER = 'main';

function defaultWorker() {
  return new Worker(new URL(stats.worker.path, import.meta.url), { type: 'module' });
}

export function startScan(input, options, hooks = {}, makeWorker = defaultWorker) {
  const control = { cancelled: false, worker: null, started: false, settled: false };
  let resolveDone;
  const done = new Promise((resolve) => { resolveDone = resolve; });

  const settle = (value) => {
    if (control.settled) return;
    control.settled = true;
    if (control.worker) control.worker.terminate();
    control.worker = null;
    resolveDone(value);
  };

  const runOnMain = () => {
    if (control.settled) return;
    if (control.worker) control.worker.terminate();
    control.worker = null;
    const mainHooks = { progress: hooks.progress, shouldCancel: () => control.cancelled };
    runScan(input, { ...options, runner: MAIN_RUNNER }, mainHooks)
      .then(settle, () => settle({ error: stats.worker.scanFailed }));
  };

  const cancel = () => {
    control.cancelled = true;
    if (control.worker) control.worker.postMessage({ type: 'cancel' });
  };

  let worker;
  try {
    worker = makeWorker();
  } catch {
    runOnMain();
    return { cancel, done };
  }
  control.worker = worker;

  worker.onmessage = (event) => {
    const msg = event.data;
    control.started = true;
    if (msg.type === 'progress') {
      if (hooks.progress) hooks.progress(msg.stage, msg.fraction);
    } else if (msg.type === 'result') {
      settle(msg.result);
    } else if (msg.type === 'error') {
      settle({ error: stats.worker.scanFailed });
    }
  };

  worker.onerror = () => {
    if (control.started) settle({ error: stats.worker.workerFailed });
    else runOnMain();
  };

  try {
    worker.postMessage({ type: 'start', input, options: { ...options, runner: WORKER_RUNNER } });
  } catch {
    runOnMain();
  }

  return { cancel, done };
}
