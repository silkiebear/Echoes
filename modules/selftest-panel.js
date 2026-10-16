import { runAll } from '../core/harness.js';
import { tests } from '../selftest/index.js';

const APP_ROOT = new URL('../', import.meta.url);

export default {
  id: 'selftest-panel',
  title: 'Self-test',
  phase: 0,
  order: 20,
  mount(container, ctx) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Run self-test';
    const status = document.createElement('p');
    status.className = 'status-line';
    status.setAttribute('role', 'status');
    const list = document.createElement('ul');
    list.className = 'plain';
    container.append(button, status, list);

    button.addEventListener('click', async () => {
      button.disabled = true;
      status.textContent = 'Running...';
      list.replaceChildren();
      const snapshot = ctx.diag.snapshot();
      let result;
      try {
        result = await runAll(tests, APP_ROOT);
      } finally {
        ctx.diag.restore(snapshot);
        button.disabled = false;
      }
      const failing = result.results.filter((r) => r.status === 'fail');
      const skipped = result.results.filter((r) => r.status === 'skip');
      const verdict = result.failed === 0 ? 'ALL PASSED' : 'FAILURES';
      status.textContent = `${verdict}: passed ${result.passed}, failed ${result.failed}, skipped ${result.skipped}`;
      for (const r of failing) {
        const item = document.createElement('li');
        item.textContent = `FAIL ${r.file} :: ${r.name}: ${r.error}`;
        list.append(item);
      }
      for (const r of skipped) {
        const item = document.createElement('li');
        item.textContent = `SKIP ${r.name} (${r.reason})`;
        list.append(item);
      }
      ctx.diag.setSelftest({
        ran: new Date().toISOString(),
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        failing: failing.map((r) => ({ file: r.file, name: r.name, error: r.error })),
      });
      ctx.diag.logStatic('INFO', 'self-test finished', { passed: result.passed, failed: result.failed, skipped: result.skipped });
    });
  },
};
