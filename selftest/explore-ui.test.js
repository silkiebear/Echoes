// Explore tab at 320 px, dark and light (browser only; phase 4c, 4c.2; mood colours from the settings, 4d.0.2). Synthetic
// data goes through the same parse path as a real load and is put into the live store only for this test; the store
// (data, parse stats, selection, settings) is restored afterwards. Checks: targets at least 44 px, no sideways scroll, the
// T cards draw SVG with no black fill, and T1 uses the default mood presets (names as text, stored colour on a day).
import { test, skip, assert } from '../core/harness.js';
import * as store from '../core/store.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { defaultSettings } from '../core/settings.js';
import { synth as synthConfig } from '../config/synth.js';
import { parser } from '../config/parser.js';
import { explore } from '../config/explore.js';
import select from '../modules/explore-select.js';
import time from '../modules/explore-time.js';

const WIDTH = 320;
const MIN_TARGET = 44;
const PICK = 3;
const BLACK = 'rgb(0, 0, 0)';
const PRESET_NAMES = ['awful', 'bad', 'meh', 'good', 'yay!'];

function rgbOf(hex) {
  return `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
}

if (typeof document === 'undefined') {
  skip('explore tab at 320 px: targets, no sideways scroll, T cards draw with no black fill, store restored', 'browser only');
} else {
  test('explore tab at 320 px: targets 44 px, no sideways scroll, T cards draw with no black fill; store restored', () => {
    const saved = { data: store.get().data, parseStats: store.get().parseStats, selection: store.get().selection, settings: store.get().settings };
    const original = document.documentElement.getAttribute('data-theme');
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    try {
      const parsed = parseExport(exportText(synthConfig, {}), parser).data;
      store.set({ data: parsed, parseStats: null, selection: [], settings: defaultSettings() });
      const selectBox = document.createElement('div');
      const timeBox = document.createElement('div');
      host.append(selectBox, timeBox);
      select.mount(selectBox, {});
      time.mount(timeBox, {});

      const search = selectBox.querySelector('.explore-input');
      search.value = parsed.labels[0].text.slice(0, explore.selection.minChars);
      search.dispatchEvent(new Event('input'));
      const results = [...selectBox.querySelectorAll('.explore-result')];
      if (results.length === 0) failures.push('no search results');
      for (const pick of results.slice(0, PICK)) pick.click();
      if (store.get().selection.length === 0) failures.push('no label was picked');

      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        if (host.scrollWidth > host.clientWidth) failures.push(`${theme}: sideways scroll ${host.scrollWidth} > ${host.clientWidth}`);
        const targets = selectBox.querySelectorAll('.explore-input, .explore-result, .explore-chip-remove, .explore-clear');
        for (const target of targets) {
          const height = target.getBoundingClientRect().height;
          if (!(height >= MIN_TARGET)) failures.push(`${theme}: ${target.className} is ${height} px tall`);
        }
        const cards = [...timeBox.querySelectorAll('section.card')];
        if (cards.length !== 4) failures.push(`${theme}: ${cards.length} T cards, expected 4`);
        const legend = cards[0].textContent;
        for (const name of PRESET_NAMES) {
          if (!legend.includes(name)) failures.push(`${theme}: T1 legend lacks the mood name ${name}`);
        }
        const day = cards[0].querySelector('rect[style]');
        if (!day) {
          failures.push(`${theme}: T1 has no day cell with a stored colour`);
        } else {
          const hex = /#[0-9a-fA-F]{6}/.exec(day.getAttribute('style'))[0];
          const fill = getComputedStyle(day).fill;
          if (fill !== rgbOf(hex)) failures.push(`${theme}: T1 day fill is ${fill}, expected ${rgbOf(hex)}`);
        }
        for (const card of cards) {
          const svg = card.querySelector('svg');
          if (!svg) {
            failures.push(`${theme}: ${card.querySelector('h2').textContent} drew no SVG`);
            continue;
          }
          const black = [...svg.querySelectorAll('rect, path')].filter((n) => getComputedStyle(n).fill === BLACK).length;
          if (black > 0) failures.push(`${theme}: ${card.querySelector('h2').textContent} has ${black} shapes with the black default fill`);
        }
      }
    } finally {
      host.remove();
      store.set(saved);
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.ok(failures.length === 0, failures.join('; '));
  });
}
