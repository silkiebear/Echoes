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
import echoScan, { sortOrder, visibleRows } from '../modules/echo-scan.js';

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

test('hide flagged: a row with a true flag or a long-run label is hidden; a null flag is not; nothing is removed when off', () => {
  const rows = [
    { flags: { lowSample: false, failsFdr: null }, longRuns: false },
    { flags: { lowSample: true, failsFdr: null }, longRuns: false },
    { flags: { lowSample: null, failsFdr: null }, longRuns: true },
    { flags: { lowSample: null, failsFdr: null }, longRuns: false },
  ];
  assert.deepEqual(visibleRows(rows, false), [0, 1, 2, 3], 'hiding off removed rows');
  assert.deepEqual(visibleRows(rows, true), [0, 3], 'flagged rows not hidden, or null flag hidden');
  assert.deepEqual(visibleRows([rows[1], rows[2]], true), [], 'all flagged: nothing left');
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

  test('echo scan card: Show more and Show less, hide flagged removes flagged rows, targets are 44 px', async () => {
    const ui = stats.ui;
    const card = document.createElement('section');
    card.className = 'card';
    card.style.width = `${WIDTH}px`;
    document.body.append(card);
    const failures = [];
    const countItems = () => card.querySelectorAll('.scan-item').length;
    const rowsNote = () => {
      const note = [...card.querySelectorAll('.scan-note')].find((n) => / of \d+ rows$/.test(n.textContent));
      const m = note ? /(\d+) of (\d+) rows/.exec(note.textContent) : null;
      return m ? { shown: Number(m[1]), returned: Number(m[2]) } : null;
    };
    try {
      echoScan.mount(card, { diag });
      const sourceSel = card.querySelector(`select[aria-label="${ui.labels.source}"]`);
      sourceSel.value = 'wide';
      sourceSel.dispatchEvent(new Event('change'));
      buttonNamed(card, ui.run).click();
      await waitFor(() => card.querySelector('.scan-list, .scan-notice'));

      const all = rowsNote();
      if (!all) failures.push('no "shown of returned" line');
      else {
        if (all.shown !== all.returned) failures.push(`before hiding, ${all.shown} shown of ${all.returned} returned`);
        if (all.returned <= ui.pageRows) failures.push(`sample has ${all.returned} rows; the test needs more than ${ui.pageRows}`);
        if (countItems() !== ui.pageRows) failures.push(`first page has ${countItems()} items, expected ${ui.pageRows}`);
        const more = buttonNamed(card, ui.showMore);
        if (!more) failures.push('no Show more');
        else more.click();
        if (countItems() !== all.returned) failures.push(`after Show more: ${countItems()} items, expected ${all.returned}`);
        const less = buttonNamed(card, ui.showLess);
        if (!less) failures.push('no Show less after Show more');
        else less.click();
        if (countItems() !== ui.pageRows) failures.push(`after Show less: ${countItems()} items, expected ${ui.pageRows}`);
      }

      const toggle = card.querySelector('label.check input[type="checkbox"]');
      if (!toggle) failures.push('no hide-flagged checkbox');
      else {
        const label = toggle.closest('label');
        if (!(label.getBoundingClientRect().height >= MIN_TARGET)) failures.push(`hide toggle is ${label.getBoundingClientRect().height} px tall`);
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
        const hidden = rowsNote();
        if (!hidden) failures.push('no line after hiding');
        else if (all && hidden.returned !== all.returned) failures.push('hiding changed the returned count');
        else if (all && hidden.shown >= all.returned) failures.push(`hiding removed nothing (${hidden.shown} of ${hidden.returned})`);
        const flagged = [...card.querySelectorAll('.scan-item')].filter((item) => item.querySelector('.scan-pill') || item.classList.contains('scan-item-long'));
        if (flagged.length > 0) failures.push(`${flagged.length} flagged items still shown`);
        for (const btn of card.querySelectorAll('.scan-list ~ button')) {
          if (!(btn.getBoundingClientRect().height >= MIN_TARGET)) failures.push(`${btn.textContent} is ${btn.getBoundingClientRect().height} px tall`);
        }
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
        if (all && rowsNote()?.shown !== all.returned) failures.push('unchecking did not restore every row');
      }
    } finally {
      card.remove();
    }
    assert.ok(failures.length === 0, failures.join('; '));
  });
}
