// Browser only: the data cards at 320 px in dark and light theme. It fills the live store with synthetic data for
// the check and restores the previous state afterwards, so the user's loaded data is never replaced.
import { test, skip, assert } from '../core/harness.js';
import * as diag from '../core/diag.js';
import * as store from '../core/store.js';
import { parser } from '../config/parser.js';
import { settingsConfig } from '../config/settings.js';
import { synth } from '../config/synth.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { applyOrder, orderFromTaps } from '../core/mood.js';
import dataLoad from '../modules/data-load.js';
import moodSetup from '../modules/mood-setup.js';
import q1Coverage from '../modules/q1-coverage.js';
import q2LabelCoding from '../modules/q2-label-coding.js';

const WIDTH = 320;
const MIN_TARGET = 44;
// A word or number that takes more than this many lines has broken mid-word (phase 4a, U2).
const MAX_LINES = 1.6;

if (typeof document === 'undefined') {
  skip('data cards at 320 px: no horizontal scroll, 44 px targets, swatch fill, text contrast', 'browser only');
} else {
  test('data cards at 320 px: no horizontal scroll, 44 px targets, swatch fill, text contrast', () => {
    const before = { ...store.get() };
    const original = document.documentElement.getAttribute('data-theme');
    const cards = [];
    const failures = [];
    try {
      const data = parseExport(exportText(synth, {}), parser).data;
      const names = [...new Set(data.moodNames)];
      const moods = applyOrder(before.settings, orderFromTaps(names, names), settingsConfig.moodPalette);
      store.set({ data, settings: { ...before.settings, moods } });
      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        for (const mod of [dataLoad, moodSetup, q1Coverage, q2LabelCoding]) {
          const card = document.createElement('section');
          card.className = 'card';
          card.style.width = `${WIDTH}px`;
          document.body.append(card);
          cards.push(card);
          mod.mount(card, { diag });
          const label = `${theme}, ${mod.id}`;
          if (card.scrollWidth > card.clientWidth) failures.push(`${label}: card scrolls sideways`);
          for (const target of card.querySelectorAll('button, select')) {
            const height = parseFloat(getComputedStyle(target).height);
            if (!(height >= MIN_TARGET)) failures.push(`${label}: ${target.tagName} is ${height} px tall`);
          }
          const note = card.querySelector('.data-note');
          if (note && getComputedStyle(note).color === getComputedStyle(card).backgroundColor) {
            failures.push(`${label}: note text has the card background colour`);
          }
          if (mod === moodSetup) {
            const swatch = card.querySelector('.m2-swatch');
            if (!swatch) {
              failures.push(`${label}: no M2 swatch`);
            } else {
              const fill = getComputedStyle(swatch).fill;
              const hex = swatch.getAttribute('fill');
              const expected = `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
              if (fill !== expected) failures.push(`${label}: swatch fill is ${fill}, expected ${expected}`);
            }
          }
        }
      }
    } finally {
      for (const card of cards) card.remove();
      store.set({ data: before.data, parseStats: before.parseStats, settings: before.settings });
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.equal(failures.length, 0, failures.slice(0, 10).join('; '));
  });

  // The store notifies the live Explore cards synchronously. With a label selected there, T4 reads the empty days set
  // below and throws (phase 4d, 4d.0.1), so this check clears the selection and restores it afterwards.
  function q2ManyLabels() {
    const before = { ...store.get() };
    const card = document.createElement('section');
    card.className = 'card';
    card.style.width = `${WIDTH}px`;
    document.body.append(card);
    try {
      const labels = Array.from({ length: 300 }, (_, id) => ({ id, text: `Label ${id} S${id % 2 ? '+' : '-'}` }));
      store.set({ data: { labels, entries: [], days: [], moodNames: [] }, selection: [], settings: before.settings });
      q2LabelCoding.mount(card, { diag });
      assert.equal(card.querySelectorAll('li').length, 200, 'rows shown');
      assert.ok(card.textContent.includes('showing 200 of 300'), 'showing line present');
    } finally {
      card.remove();
      store.set({ data: before.data, parseStats: before.parseStats, selection: before.selection, settings: before.settings });
    }
  }

  test('Q2 with 300 labels shows 200 rows and "showing 200 of 300"', q2ManyLabels);

  test('Q2 with 300 labels passes while the live store holds a selection (guard for 4d.0.1)', () => {
    const saved = store.get().selection;
    try {
      store.set({ selection: [0, 1] });
      q2ManyLabels();
    } finally {
      store.set({ selection: saved });
    }
  });

  test('Q1 tables at 320 px: no word or number breaks mid-word; the card does not scroll sideways', () => {
    const before = { ...store.get() };
    const card = document.createElement('section');
    card.className = 'card';
    card.style.width = `${WIDTH}px`;
    document.body.append(card);
    const failures = [];
    try {
      const data = parseExport(exportText(synth, {}), parser).data;
      store.set({ data, settings: before.settings });
      q1Coverage.mount(card, { diag });
      // Measure the text, not the cell: a table cell takes the height of its row, so a neighbour can stretch it.
      const cells = [...card.querySelectorAll('th, td')].filter((c) => !/\s/.test(c.textContent));
      if (cells.length === 0) failures.push('no single-word cells in the Q1 tables');
      for (const cell of cells) {
        const range = document.createRange();
        range.selectNodeContents(cell);
        const lines = range.getBoundingClientRect().height / parseFloat(getComputedStyle(cell).lineHeight);
        if (lines > MAX_LINES) failures.push(`"${cell.textContent}" takes ${lines.toFixed(2)} lines`);
      }
      if (card.scrollWidth > card.clientWidth) failures.push('card scrolls sideways');
    } finally {
      card.remove();
      store.set({ data: before.data, parseStats: before.parseStats, settings: before.settings });
    }
    assert.equal(failures.length, 0, failures.slice(0, 10).join('; '));
  });
}
