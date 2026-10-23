// Explore help at 320 px, dark and light (browser only; phase 4e, 4e.1). Every Explore card has a collapsed "How to read
// this" block; the toggle opens four captioned parts and sets aria-expanded; targets are at least 44 px; no sideways
// scroll; the text colour differs from the card background. The synthetic export goes through the same parse path as a
// real load; the store (data, parse stats, selection, pair, scan result, settings) is restored afterwards.
import { test, skip, assert } from '../core/harness.js';
import * as store from '../core/store.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { defaultSettings } from '../core/settings.js';
import { synth as synthConfig } from '../config/synth.js';
import { parser } from '../config/parser.js';
import { exploreHelp } from '../config/explore-help.js';
import * as selectMod from '../modules/explore-select.js';
import * as timeMod from '../modules/explore-time.js';
import * as periodicMod from '../modules/explore-periodic.js';
import * as combosMod from '../modules/explore-combos.js';
import * as moodMod from '../modules/explore-mood.js';
import * as echoMod from '../modules/explore-echo.js';
import * as helpMod from '../modules/explore-help.js';

const WIDTH = 320;
const MIN_TARGET = 44;
const EVENT_TEXT = 'Late coffee F-';
const OUTCOME_TEXT = 'Poor sleep S-';
const PARTS = ['what', 'how', 'numbers', 'care'];
// Cards in the Explore tab: the glossary, four T cards, four P cards and three E cards.
const EXPECTED_CARDS = 15;

if (typeof document === 'undefined') {
  skip('explore help at 320 px: every card has a block that opens, targets 44 px, no sideways scroll; store restored', 'browser only');
} else {
  test('explore help at 320 px: every card has a block that opens with four captioned parts; no sideways scroll; store restored', () => {
    const saved = {
      data: store.get().data,
      parseStats: store.get().parseStats,
      selection: store.get().selection,
      pair: store.get().pair,
      scanResult: store.get().scanResult,
      settings: store.get().settings,
    };
    const original = document.documentElement.getAttribute('data-theme');
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    try {
      const parsed = parseExport(exportText(synthConfig, {}), parser).data;
      const settings = defaultSettings();
      const event = parsed.labels.find((l) => l.text === EVENT_TEXT).id;
      const outcome = parsed.labels.find((l) => l.text === OUTCOME_TEXT).id;
      store.set({ data: parsed, parseStats: null, selection: [event, outcome], pair: { window: '1d' }, scanResult: null, settings });
      for (const mod of [helpMod, selectMod, timeMod, periodicMod, echoMod, combosMod, moodMod]) {
        const box = document.createElement('div');
        host.append(box);
        mod.default.mount(box, {});
      }
      const cards = [...host.querySelectorAll('section.card')];
      if (cards.length !== EXPECTED_CARDS) failures.push(`${cards.length} cards, expected ${EXPECTED_CARDS}`);
      const toggles = [...host.querySelectorAll('.help-toggle')];
      if (toggles.length !== EXPECTED_CARDS + 1) failures.push(`${toggles.length} help blocks, expected ${EXPECTED_CARDS + 1}`);

      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        if (host.scrollWidth > host.clientWidth) failures.push(`${theme}: page sideways scroll ${host.scrollWidth} > ${host.clientWidth}`);
        for (const card of cards) {
          const name = card.querySelector('h2')?.textContent ?? card.querySelector('dl, .help-toggle').className;
          if (card.scrollWidth > card.clientWidth) failures.push(`${theme}: ${name} sideways scroll ${card.scrollWidth} > ${card.clientWidth}`);
          const toggle = card.querySelector('.help-toggle');
          if (!toggle) {
            failures.push(`${theme}: ${name} has no help block`);
            continue;
          }
          const height = toggle.getBoundingClientRect().height;
          if (!(height >= MIN_TARGET)) failures.push(`${theme}: ${name} toggle is ${height} px tall`);
          if (toggle.getAttribute('aria-expanded') !== 'false') failures.push(`${theme}: ${name} starts open`);
          toggle.click();
          if (toggle.getAttribute('aria-expanded') !== 'true') failures.push(`${theme}: ${name} did not open`);
          const body = card.querySelector('.help-body');
          const groups = [...(body ? body.querySelectorAll('.grp') : [])];
          if (groups.length !== PARTS.length) failures.push(`${theme}: ${name} has ${groups.length} parts, expected ${PARTS.length}`);
          PARTS.forEach((part, i) => {
            const group = groups[i];
            if (!group) return;
            const caption = group.querySelector('.grp-caption');
            if (!caption || caption.textContent !== exploreHelp.captions[part]) failures.push(`${theme}: ${name} part ${part} caption`);
            // Text groups (4e.2): a 3 px left border with the pattern of the group, and a tint other than the card.
            const style = getComputedStyle(group);
            if (style.borderLeftWidth !== '3px') failures.push(`${theme}: ${name} part ${part} border ${style.borderLeftWidth}`);
            const wantStyle = part === 'care' ? 'dashed' : part === 'how' ? 'double' : 'solid';
            if (style.borderLeftStyle !== wantStyle) failures.push(`${theme}: ${name} part ${part} border style ${style.borderLeftStyle}, want ${wantStyle}`);
            if (style.backgroundColor === getComputedStyle(card).backgroundColor) failures.push(`${theme}: ${name} part ${part} tint equals the card`);
            const text = group.querySelector('.grp-text');
            if (!text || text.textContent.trim().length === 0) failures.push(`${theme}: ${name} part ${part} is empty`);
            else if (getComputedStyle(text).color === getComputedStyle(card).backgroundColor) failures.push(`${theme}: ${name} text colour equals the background`);
          });
          toggle.click();
          if (toggle.getAttribute('aria-expanded') !== 'false') failures.push(`${theme}: ${name} did not close`);
        }
      }
    } finally {
      host.remove();
      store.set(saved);
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.equal(failures.length, 0, failures.join('; '));
  });

  test('explore help: the Legend toggle hides and shows the glossary list only; both toggles are independent in all four combinations; both at least 44 px tall', () => {
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    try {
      helpMod.default.mount(host, {});
      const card = host.querySelector('section.card');
      const help = card.querySelector('.help-toggle');
      const legend = card.querySelector('.legend-toggle');
      const list = card.querySelector('dl.glossary');
      if (!help || !legend || !list) {
        failures.push(`glossary card has help toggle ${Boolean(help)}, legend toggle ${Boolean(legend)}, list ${Boolean(list)}`);
      } else {
        if (legend.textContent !== exploreHelp.ui.legendToggle) failures.push(`legend text "${legend.textContent}"`);
        const listShown = () => !list.hidden && getComputedStyle(list).display !== 'none';
        const want = (step, helpOpen, legendOpen) => {
          const got = `help ${help.getAttribute('aria-expanded')}, legend ${legend.getAttribute('aria-expanded')}, list ${listShown()}`;
          const expected = `help ${helpOpen}, legend ${legendOpen}, list ${legendOpen}`;
          if (got !== expected) failures.push(`${step}: got ${got}; want ${expected}`);
        };
        want('start', false, true);
        legend.click();
        want('legend closed', false, false);
        help.click();
        want('help opened, legend closed', true, false);
        legend.click();
        want('legend opened, help open', true, true);
        help.click();
        want('help closed, legend open', false, true);
        legend.click();
        want('legend closed, help closed', false, false);
        legend.click();
        want('legend reopened', false, true);
        for (const [name, button] of [['help', help], ['legend', legend]]) {
          const height = button.getBoundingClientRect().height;
          if (!(height >= MIN_TARGET)) failures.push(`${name} toggle is ${height} px tall, want at least ${MIN_TARGET}`);
        }
      }
    } finally {
      host.remove();
    }
    assert.equal(failures.length, 0, failures.join('; '));
  });
}
