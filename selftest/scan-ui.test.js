// Browser only: the echo scan card at 320 px after one synthetic run, dark and light. Checks the summary number (the same
// scan run again through startScan, which is deterministic), table text colour against the card background, the pill
// border, touch targets, no sideways scroll of the card, and that the sort control keeps every row. The live store is not
// used by the synthetic run and is checked to be unchanged.
import { test, skip, assert } from '../core/harness.js';
import * as diag from '../core/diag.js';
import * as store from '../core/store.js';
import { formatNumber } from '../core/format.js';
import { startScan } from '../core/stats/client.js';
import { generateWide } from '../core/synth-wide.js';
import { defaultSettings } from '../core/settings.js';
import { stats } from '../config/stats.js';
import { statsSynth } from '../config/stats-synth.js';
import echoScan from '../modules/echo-scan.js';

const WIDTH = 320;
const MIN_TARGET = 44;
const WAIT_STEP_MS = 100;
const WAIT_LIMIT_MS = 120000;

function waitFor(check) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const found = check();
      if (found) resolve(found);
      else if (Date.now() - started > WAIT_LIMIT_MS) reject(new Error('scan did not finish in time'));
      else setTimeout(tick, WAIT_STEP_MS);
    };
    tick();
  });
}

function buttonNamed(card, text) {
  return [...card.querySelectorAll('button')].find((b) => b.textContent === text);
}

if (typeof document === 'undefined') {
  skip('echo scan card at 320 px: summary, colours, pill border, touch targets, sort keeps rows', 'browser only');
} else {
  test('echo scan card at 320 px: summary, colours, pill border, touch targets, sort keeps rows', async () => {
    const ui = stats.ui;
    const liveData = store.get().data;
    const original = document.documentElement.getAttribute('data-theme');
    const card = document.createElement('section');
    card.className = 'card';
    card.style.width = `${WIDTH}px`;
    document.body.append(card);
    const failures = [];
    try {
      echoScan.mount(card, { diag });
      const sourceSel = card.querySelector(`select[aria-label="${ui.labels.source}"]`);
      const sortSel = card.querySelector(`select[aria-label="${ui.labels.sort}"]`);
      sourceSel.value = 'wide';
      sourceSel.dispatchEvent(new Event('change'));
      buttonNamed(card, ui.run).click();
      await waitFor(() => card.querySelector('.scan-table, .scan-notice'));

      const summary = [...card.querySelectorAll('.scan-note')].find((n) => n.textContent.startsWith(`${ui.summary.cells}: `));
      const expected = await startScan({
        data: generateWide(statsSynth, statsSynth.seed, statsSynth.fillerCount),
        settings: defaultSettings(),
      }, { mode: 'fast' }).done;
      if (!summary) {
        failures.push('no summary line');
      } else {
        const discoveriesText = `${ui.summary.discoveries}: ${formatNumber(expected.meta.discoveries)} (`;
        if (!summary.textContent.includes(discoveriesText)) failures.push(`summary lacks "${discoveriesText}"`);
      }

      const rowsBefore = card.querySelectorAll('.scan-table tbody tr').length;
      if (rowsBefore === 0) failures.push('no table rows');
      if (!sortSel) failures.push('no sort control');
      else {
        sortSel.value = 'placebo';
        sortSel.dispatchEvent(new Event('change'));
        const rowsAfter = card.querySelectorAll('.scan-table tbody tr').length;
        if (rowsAfter !== rowsBefore) failures.push(`sort changed the row count from ${rowsBefore} to ${rowsAfter}`);
      }

      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        const box = card.querySelector('.scan-box');
        const boxStyle = getComputedStyle(box);
        if (card.scrollWidth > card.clientWidth) failures.push(`${theme}: card scrolls sideways`);
        for (const target of card.querySelectorAll('.scan-row button, .scan-row select')) {
          const height = parseFloat(getComputedStyle(target).height);
          if (!(height >= MIN_TARGET)) failures.push(`${theme}: ${target.tagName} is ${height} px tall`);
        }
        const cell = card.querySelector('.scan-table tbody td');
        if (cell && getComputedStyle(cell).color === boxStyle.backgroundColor) {
          failures.push(`${theme}: table text has the card background colour`);
        }
        const pill = card.querySelector('.scan-pill');
        if (pill) {
          const border = parseFloat(getComputedStyle(pill).borderTopWidth);
          if (!(border >= 1)) failures.push(`${theme}: pill border is ${border} px`);
          if (getComputedStyle(pill).color === boxStyle.backgroundColor) failures.push(`${theme}: pill text has the background colour`);
        }
      }
    } finally {
      card.remove();
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.ok(store.get().data === liveData, 'live store data unchanged');
    assert.ok(failures.length === 0, failures.join('; '));
  });
}
