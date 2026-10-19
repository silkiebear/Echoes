// Self-test panel (Tools tab): one button per group (config\selftest-groups.js) and "Run all". Groups run one file at a
// time, so a page that is hidden can stop a run at the next file boundary. The live diagnostics state is restored
// after every run (SPEC 8).
import { runAll } from '../core/harness.js';
import { groups, groupText } from '../config/selftest-groups.js';
import { moduleHelp } from '../core/module-help.js';

const APP_ROOT = new URL('../', import.meta.url);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function labelOf(group) {
  return `${group.title} (${group.files.length} ${groupText.files})`;
}

// Totals of several group results, for the status line and the diagnostics.
function sumOf(results) {
  const sum = (key) => results.reduce((total, r) => total + r[key], 0);
  return { passed: sum('passed'), failed: sum('failed'), skipped: sum('skipped') };
}

async function runGroup(group, run) {
  const result = { id: group.id, title: group.title, passed: 0, failed: 0, skipped: 0, ms: 0, failing: [], skips: [] };
  for (const file of group.files) {
    if (run.cancelled) break;
    const start = performance.now();
    const r = await runAll([file], APP_ROOT);
    result.ms += performance.now() - start;
    result.passed += r.passed;
    result.failed += r.failed;
    result.skipped += r.skipped;
    for (const x of r.results) {
      if (x.status === 'fail') result.failing.push({ file: x.file, name: x.name, error: x.error });
      if (x.status === 'skip') result.skips.push({ name: x.name, reason: x.reason });
    }
  }
  result.ms = Math.round(result.ms);
  return result;
}

let wakeLock = null;

// Keeps the screen awake during a run where the browser allows it. Support is UNVERIFIED on Firefox and Chrome for iOS.
async function acquireLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch {
    wakeLock = null;
  }
}

async function releaseLock() {
  try {
    if (wakeLock) await wakeLock.release();
  } catch {
    // The browser already released it; nothing to undo.
  }
  wakeLock = null;
}

export default {
  id: 'selftest-panel',
  title: 'Self-test',
  phase: 0,
  order: 20,
  mount(container, ctx) {
    container.append(moduleHelp('selftest-panel'));
    const diag = ctx.diag;
    diag.logStatic('INFO', 'self-test wake lock', { supported: 'wakeLock' in navigator ? 'yes' : 'no' });
    const results = new Map(); // group id -> last complete result
    const buttons = new Map(); // group id -> button
    const status = el('p', 'status-line', groupText.idle);
    status.setAttribute('role', 'status');
    const list = el('ul', 'plain');
    const row = el('div', 'row');
    for (const group of groups) {
      const btn = el('button', null, labelOf(group));
      btn.type = 'button';
      btn.addEventListener('click', () => start([group], group.title));
      buttons.set(group.id, btn);
      row.append(btn);
    }
    const runAllBtn = el('button', null, groupText.runAll);
    runAllBtn.type = 'button';
    runAllBtn.addEventListener('click', () => start(groups, groupText.runAll));
    row.append(runAllBtn);
    container.append(row, status, list);

    let active = null; // the run in progress, or the last one (finished or abandoned)

    function setBusy(busy) {
      for (const btn of [...buttons.values(), runAllBtn]) btn.disabled = busy;
    }

    function setRunning(group, on) {
      const btn = buttons.get(group.id);
      btn.textContent = on ? `${labelOf(group)}, ${groupText.running}` : labelOf(group);
      btn.setAttribute('aria-busy', String(on));
    }

    function publish() {
      const current = groups.map((g) => results.get(g.id)).filter(Boolean);
      const totals = sumOf(current);
      diag.setSelftest({
        ran: new Date().toISOString(),
        groups: current.map(({ id, title, passed, failed, skipped, ms }) => ({ id, title, passed, failed, skipped, ms })),
        ...totals,
        failing: current.flatMap((r) => r.failing),
      });
    }

    function finish(run, label) {
      setBusy(false);
      if (run.cancelled) {
        status.textContent = groupText.interrupted;
        return;
      }
      const totals = sumOf(run.totals);
      const verdict = totals.failed === 0 ? groupText.allPassed : groupText.failures;
      status.textContent = `${label}: ${verdict}: passed ${totals.passed}, failed ${totals.failed}, skipped ${totals.skipped}`;
      list.replaceChildren();
      for (const r of run.totals) {
        for (const f of r.failing) list.append(el('li', null, `Failed: ${f.name} (${f.file}): ${f.error}`));
        for (const s of r.skips) list.append(el('li', null, `Skipped: ${s.name} (${s.reason})`));
      }
      publish();
      diag.logStatic('INFO', 'self-test finished', totals);
    }

    async function start(toRun, label) {
      // A run that was left behind by a hidden page finishes its current file first; two runs never overlap.
      if (active && !active.finished) await active.done;
      const run = { cancelled: false, finished: false, abandoned: false, totals: [], done: null, resolve: null };
      run.done = new Promise((resolve) => { run.resolve = resolve; });
      active = run;
      setBusy(true);
      list.replaceChildren();
      status.textContent = `${label}: ${groupText.running}...`;
      const snapshot = diag.snapshot();
      await acquireLock();
      try {
        for (const group of toRun) {
          if (run.cancelled) break;
          setRunning(group, true);
          const result = await runGroup(group, run);
          setRunning(group, false);
          if (!run.cancelled) results.set(group.id, result);
          run.totals.push(result);
        }
      } finally {
        diag.restore(snapshot);
        await releaseLock();
        run.finished = true;
        run.resolve();
        if (!run.abandoned) finish(run, label);
      }
    }

    // The page was hidden during a run: stop it at the next file. When the page is visible again and the run is still
    // going, give the buttons back; the old run ends on its own and its result is dropped.
    document.addEventListener('visibilitychange', () => {
      const run = active;
      if (!run || run.finished) return;
      if (document.hidden) {
        run.cancelled = true;
        return;
      }
      run.abandoned = true;
      status.textContent = groupText.interrupted;
      setBusy(false);
    });
  },
};
