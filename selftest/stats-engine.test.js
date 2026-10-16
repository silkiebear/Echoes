// Engine behaviour on synthetic data: determinism, cancel, top-K flags, notices, privacy and the Node time budget.
import { test, assert, skip } from '../core/harness.js';
import { runScan } from '../core/stats/run.js';
import { generateWide } from '../core/synth-wide.js';
import { defaultSettings } from '../core/settings.js';
import { statsSynth } from '../config/stats-synth.js';
import { stats } from '../config/stats.js';
import * as diag from '../core/diag.js';

const CANCEL_LIMIT_MS = 1000;
const FILLERS_SMALL = 60;
const FILLERS_NOTICE = 20;
const TOP_K_FLAGS = ['failsTimeSplit', 'lowCompletenessSensitive', 'highAutocorrelation'];

// ms is wall-clock time, so the determinism check compares everything else.
function withoutTiming(result) {
  return JSON.stringify({ ...result, meta: { ...result.meta, ms: 0 } });
}

test('determinism: the same input and options give identical JSON apart from meta.ms', async () => {
  const data = generateWide(statsSynth, statsSynth.seed, FILLERS_SMALL);
  const settings = defaultSettings();
  const a = await runScan({ data, settings }, { mode: 'fast' }, {});
  const b = await runScan({ data, settings }, { mode: 'fast' }, {});
  assert.equal(withoutTiming(a), withoutTiming(b), 'results differ');
});

test('cancel: after the second progress event the scan returns within the limit with cancelled set', async () => {
  const data = generateWide(statsSynth, statsSynth.seed);
  let progressCalls = 0;
  const hooks = { progress: () => { progressCalls += 1; }, shouldCancel: () => progressCalls >= 2 };
  const started = performance.now();
  const result = await runScan({ data, settings: defaultSettings() }, { mode: 'fast' }, hooks);
  const elapsed = performance.now() - started;
  assert.equal(result.meta.cancelled, true, 'cancelled flag');
  assert.ok(elapsed < CANCEL_LIMIT_MS, `took ${Math.round(elapsed)} ms`);
});

test('flags that need the top-K stages are null outside the top-K, never false', async () => {
  const data = generateWide(statsSynth, statsSynth.seed, FILLERS_SMALL);
  const result = await runScan({ data, settings: defaultSettings() }, { mode: 'fast' }, {});
  const outside = result.rows.filter((row) => row.placeboP === null);
  assert.ok(outside.length > 0, 'some rows lie outside the top-K');
  for (const row of outside) {
    for (const id of TOP_K_FLAGS) assert.equal(row.flags[id], null, `${id} outside the top-K`);
  }
  for (const row of result.rows.filter((r) => r.placeboP !== null)) {
    for (const id of TOP_K_FLAGS) assert.ok(row.flags[id] !== null, `${id} inside the top-K`);
  }
});

test('notice: a flag carried by every kept row is named; a flag carried by none is not', async () => {
  const data = generateWide(statsSynth, statsSynth.seed, FILLERS_NOTICE);
  const settings = defaultSettings();
  const short = await runScan({ data, settings }, { windows: [{ id: '3d', days: 3 }] }, {});
  assert.ok(short.rows.length > 0, 'rows exist');
  assert.ok(short.notices.includes('shortWindow'), 'shortWindow notice');
  const long = await runScan({ data, settings }, { windows: [{ id: '1y', days: 365 }] }, {});
  assert.ok(!long.notices.includes('shortWindow'), 'no shortWindow notice for long windows');
});

test('privacy: a label text is absent from the result and from the diagnostics', async () => {
  const data = generateWide(statsSynth, statsSynth.seed, FILLERS_NOTICE);
  for (const label of data.labels) label.text = `ZZPRIVATEWORD ${label.id}`;
  const result = await runScan({ data, settings: defaultSettings() }, { mode: 'fast' }, {});
  assert.ok(!JSON.stringify(result).includes('ZZPRIVATEWORD'), 'result carries label text');
  assert.ok(!diag.build({ includeData: false }).includes('ZZPRIVATEWORD'), 'diagnostics carry label text');
});

// Node-only: the browser run is measured by hand, not asserted (3.3).
if (typeof window === 'undefined') {
  test('perf: the large synthetic scan finishes within the Node budget', async () => {
    const data = generateWide(statsSynth, statsSynth.seed, statsSynth.fillerCountLarge);
    const started = performance.now();
    const result = await runScan({ data, settings: defaultSettings() }, { mode: 'fast' }, {});
    const ms = Math.round(performance.now() - started);
    console.log(`perf: large scan ${ms} ms, ${result.meta.cellsTested} cells tested, runner ${result.meta.runner}`);
    assert.ok(ms <= stats.perf.maxScanMsNode, `scan took ${ms} ms`);
  });
} else {
  skip('perf: the large synthetic scan finishes within the Node budget', 'Node only');
}
