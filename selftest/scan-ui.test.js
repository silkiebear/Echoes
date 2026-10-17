// Echo scan card at 320 px (browser only) and the sort order (pure, also runs in Node). Card checks: the summary number
// (the same scan run again through startScan, which is deterministic), text colour against the item background, the pill
// and long-run borders, touch targets, no element wider than the card, item heads at most ui.maxHeadLines lines, and that
// the sort control keeps every row. The live store is not used by the synthetic run and is checked to be unchanged.
import { test, skip, assert } from '../core/harness.js';
import * as diag from '../core/diag.js';
import * as store from '../core/store.js';
import { formatNumber } from '../core/format.js';
import { startScan } from '../core/stats/client.js';
import { generateWide } from '../core/synth-wide.js';
import { defaultSettings } from '../core/settings.js';
import { stats } from '../config/stats.js';
import { statsSynth } from '../config/stats-synth.js';
import echoScan, { sortOrder } from '../modules/echo-scan.js';

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

test('sort order: placebo-first moves a row with a placebo p to the front; both orders keep every row', () => {
  const rows = [{ placeboP: null }, { placeboP: 0.2 }, { placeboP: null }];
  const engine = sortOrder(rows, 'q');
  const placebo = sortOrder(rows, 'placebo');
  assert.deepEqual(engine, [0, 1, 2], 'engine order changed');
  assert.ok(placebo[0] !== engine[0], 'placebo-first order did not move any row');
  assert.deepEqual([...placebo].sort((a, b) => a - b), [0, 1, 2], 'placebo-first order dropped or repeated a row');
});

if (typeof document === 'undefined') {
  skip('echo scan card at 320 px: summary, colours, borders, touch targets, overflow, sort keeps rows', 'browser only');
} else {
  test('echo scan card at 320 px: summary, colours, borders, touch targets, overflow, sort keeps rows', async () => {
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
      await waitFor(() => card.querySelector('.scan-list, .scan-notice'));

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

      const rowsBefore = card.querySelectorAll('.scan-item').length;
      if (rowsBefore === 0) failures.push('no items');
      if (!sortSel) failures.push('no sort control');
      else {
        sortSel.value = 'placebo';
        sortSel.dispatchEvent(new Event('change'));
        const rowsAfter = card.querySelectorAll('.scan-item').length;
        if (rowsAfter !== rowsBefore) failures.push(`sort changed the row count from ${rowsBefore} to ${rowsAfter}`);
      }

      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        if (card.scrollWidth > card.clientWidth) failures.push(`${theme}: card scrolls sideways`);
        const cardRight = card.getBoundingClientRect().right;
        for (const node of card.querySelectorAll('*')) {
          if (node.getBoundingClientRect().right > cardRight) {
            failures.push(`${theme}: ${node.className || node.tagName} extends past the card`);
            break;
          }
        }
        for (const target of card.querySelectorAll('.scan-row button, .scan-row select')) {
          const height = parseFloat(getComputedStyle(target).height);
          if (!(height >= MIN_TARGET)) failures.push(`${theme}: ${target.tagName} is ${height} px tall`);
        }
        const item = card.querySelector('.scan-item');
        const itemStyle = item ? getComputedStyle(item) : null;
        for (const head of card.querySelectorAll('.scan-item-head')) {
          const lineHeight = parseFloat(getComputedStyle(head).lineHeight);
          if (!(lineHeight > 0)) {
            failures.push(`${theme}: item head has no line height`);
            break;
          }
          const lines = Math.round(head.getBoundingClientRect().height / lineHeight);
          if (lines > ui.maxHeadLines) {
            failures.push(`${theme}: an item head wraps to ${lines} lines`);
            break;
          }
        }
        if (itemStyle) {
          const headColor = getComputedStyle(card.querySelector('.scan-item-head')).color;
          if (headColor === itemStyle.backgroundColor) failures.push(`${theme}: item text has the item background colour`);
        }
        const longItem = card.querySelector('.scan-item-long');
        if (longItem && getComputedStyle(longItem).borderTopStyle !== 'dashed') {
          failures.push(`${theme}: long-run item border is not dashed`);
        }
        const pill = card.querySelector('.scan-pill');
        if (pill) {
          const border = parseFloat(getComputedStyle(pill).borderTopWidth);
          if (!(border >= 1)) failures.push(`${theme}: pill border is ${border} px`);
          if (itemStyle && getComputedStyle(pill).color === itemStyle.backgroundColor) {
            failures.push(`${theme}: pill text has the item background colour`);
          }
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
