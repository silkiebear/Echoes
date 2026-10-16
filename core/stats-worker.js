// Statistics worker (module worker, started by core/stats/client.js). One scan per start message. Progress and the result
// go back as messages; a cancel message sets the flag the scan polls. Errors send a fixed code, never text from the scan.
import { runScan } from './stats/run.js';
import { stats } from '../config/stats.js';

let active = null;

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === 'cancel') {
    if (active) active.cancelled = true;
    return;
  }
  if (msg.type !== 'start') return;
  const run = { cancelled: false };
  active = run;
  try {
    const result = await runScan(msg.input, msg.options, {
      progress: (stage, fraction) => self.postMessage({ type: 'progress', stage, fraction }),
      shouldCancel: () => run.cancelled,
    });
    self.postMessage({ type: 'result', result });
  } catch {
    self.postMessage({ type: 'error', code: stats.worker.scanFailed });
  } finally {
    if (active === run) active = null;
  }
};
