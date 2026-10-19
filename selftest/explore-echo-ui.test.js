// Explore: the E views on real data at 320 px, dark and light (browser only; phase 4d, 4d.4). The synthetic export goes
// through the same parse path as a real load and the Echo scan runs on it; the store (data, parse stats, selection, pair,
// scan result, settings) is restored afterwards. Checks: each card draws SVG, no sideways scroll, no black default fill,
// and the E2 pair (lag rates and band) takes less than the limit in the browser.
import { test, skip, assert } from '../core/harness.js';
import * as store from '../core/store.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { defaultSettings } from '../core/settings.js';
import { prepare } from '../core/stats/prepare.js';
import { runScan } from '../core/stats/run.js';
import { stats } from '../config/stats.js';
import { viewSettings } from '../config/views.js';
import { synth as synthConfig } from '../config/synth.js';
import { parser } from '../config/parser.js';
import { buildE2Real } from '../core/echo-real.js';
import exploreEchoModule from '../modules/explore-echo.js';
import exploreTimeModule from '../modules/explore-time.js';
import explorePeriodicModule from '../modules/explore-periodic.js';

const WIDTH = 320;
const MIN_TARGET = 44;
// Measured text boxes may overrun a view edge by this much (sub-pixel rounding of the glyph box).
const TEXT_TOLERANCE_PX = 1;
const BLACK = 'rgb(0, 0, 0)';
// Phase 4d limit for one E2 pair in the browser (phase4d.md, 4d.4.5).
const E2_LIMIT_MS = 2000;
const EVENT_TEXT = 'Late coffee F-';
const OUTCOME_TEXT = 'Poor sleep S-';

if (typeof document === 'undefined') {
  skip('E views on real data at 320 px: cards, no sideways scroll, no black fill, E2 within the limit; store restored', 'browser only');
} else {
  test('E views on real data at 320 px: three cards with SVG, no sideways scroll, no black fill, E2 within the limit; store restored', async () => {
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
      const scan = await runScan({ data: parsed, settings }, { mode: 'fast', cfg: { ...stats, scanTest: 'stratified' } });
      const event = parsed.labels.find((l) => l.text === EVENT_TEXT).id;
      const outcome = parsed.labels.find((l) => l.text === OUTCOME_TEXT).id;
      store.set({
        data: parsed,
        parseStats: null,
        selection: [event, outcome],
        pair: { window: '1d' },
        scanResult: { rows: scan.rows, meta: scan.meta, data: parsed, settings },
        settings,
      });
      exploreEchoModule.mount(host, {});
      const cards = [...host.querySelectorAll('section.card')];
      if (cards.length !== 3) failures.push(`${cards.length} E cards, expected 3`);
      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        if (host.scrollWidth > host.clientWidth) failures.push(`${theme}: sideways scroll ${host.scrollWidth} > ${host.clientWidth}`);
        for (const card of cards) {
          const name = card.querySelector('h2').textContent;
          const svg = card.querySelector('svg');
          if (!svg) {
            failures.push(`${theme}: ${name} drew no SVG`);
            continue;
          }
          const black = [...svg.querySelectorAll('rect, path, polygon, circle')].filter((n) => getComputedStyle(n).fill === BLACK).length;
          if (black > 0) failures.push(`${theme}: ${name} has ${black} shapes with the black default fill`);
        }
      }
      if (!cards.some((c) => c.innerHTML.includes('placebo'))) failures.push('E2 caption (placebo band) is missing');
      const started = performance.now();
      const prepared = prepare({ data: parsed, settings });
      buildE2Real(prepared, event, outcome, {
        days: viewSettings.curve.days, shuffles: stats.placebo.shuffles.fast, seed: stats.placebo.seed, labels: parsed.labels, statsCfg: stats,
      });
      const ms = performance.now() - started;
      if (ms >= E2_LIMIT_MS) failures.push(`E2 pair took ${Math.round(ms)} ms, limit ${E2_LIMIT_MS}`);
    } finally {
      host.remove();
      store.set(saved);
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.equal(failures.length, 0, failures.join('; '));
  });

  // Phase 4f.2: the uniform label rule at 320 px. Every drawing card has a "Uses:" line; the visible selects are at least 44 px
  // tall; a changed Label select (T1) and a changed Outcome select (E2) change their card; no sideways scroll; store restored.
  test('uniform label rule at 320 px: Uses lines, 44 px selects, a changed select changes its card; store restored', async () => {
    const original = document.documentElement.getAttribute('data-theme');
    const saved = {
      data: store.get().data,
      parseStats: store.get().parseStats,
      selection: store.get().selection,
      pair: store.get().pair,
      scanResult: store.get().scanResult,
      settings: store.get().settings,
      exploreChoice: store.get().exploreChoice,
    };
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    try {
      const parsed = parseExport(exportText(synthConfig, {}), parser).data;
      const settings = defaultSettings();
      const scan = await runScan({ data: parsed, settings }, { mode: 'fast', cfg: { ...stats, scanTest: 'stratified' } });
      const event = parsed.labels.find((l) => l.text === EVENT_TEXT).id;
      const outcome = parsed.labels.find((l) => l.text === OUTCOME_TEXT).id;
      const third = parsed.labels.find((l) => l.id !== event && l.id !== outcome).id;
      const textOf = (id) => parsed.labels[id].text;
      store.set({
        data: parsed,
        parseStats: null,
        selection: [event, outcome, third],
        pair: { window: '1d' },
        scanResult: { rows: scan.rows, meta: scan.meta, data: parsed, settings },
        settings,
        exploreChoice: undefined,
      });
      exploreTimeModule.mount(host, {});
      explorePeriodicModule.mount(host, {});
      exploreEchoModule.mount(host, {});
      const cards = [...host.querySelectorAll('section.card')];
      const byTitle = (prefix) => cards.find((c) => c.querySelector('h2').textContent.startsWith(prefix));
      if (cards.length !== 11) failures.push(`${cards.length} cards, expected 11`);
      const visible = (node) => node.getClientRects().length > 0;
      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        for (const card of cards) {
          const name = card.querySelector('h2').textContent.slice(0, 2);
          const uses = [...card.querySelectorAll('p.explore-note')].find((p) => p.textContent.startsWith('Uses:'));
          if (!uses || uses.hidden) failures.push(`${theme}: ${name}: no visible Uses line`);
          for (const select of card.querySelectorAll('select')) {
            if (!visible(select)) continue;
            const height = select.getBoundingClientRect().height;
            if (!(height >= MIN_TARGET)) failures.push(`${theme}: ${name}: select ${height} px tall`);
          }
          if (host.scrollWidth > host.clientWidth) failures.push(`${theme}: sideways scroll ${host.scrollWidth} > ${host.clientWidth}`);
          if (card.scrollWidth > card.clientWidth) failures.push(`${theme}: ${name}: sideways scroll ${card.scrollWidth} > ${card.clientWidth}`);
        }
      }
      document.documentElement.removeAttribute('data-theme');
      const labelSelects = (card) => [...card.querySelectorAll('select')].filter((s) => visible(s)
        && [...s.options].some((o) => o.textContent === textOf(third)));
      for (const prefix of ['T1', 'P1', 'P3', 'P4', 'E1', 'E4']) {
        if (labelSelects(byTitle(prefix)).length < 1) failures.push(`${prefix}: no label select`);
      }
      if (labelSelects(byTitle('E2')).length < 2) failures.push('E2: Event and Outcome selects missing');

      const t1Card = byTitle('T1');
      const t1Select = labelSelects(t1Card)[0];
      t1Select.value = String(third);
      t1Select.dispatchEvent(new Event('change'));
      if (store.get().exploreChoice?.choices?.T1 !== third) failures.push('T1 select did not store the choice');
      if (!t1Card.querySelector('.explain-live-text')?.textContent.includes(textOf(third))) failures.push('T1 live sentence does not name the new label');

      const e2Card = byTitle('E2');
      const e2Outcome = labelSelects(e2Card)[1];
      e2Outcome.value = String(third);
      e2Outcome.dispatchEvent(new Event('change'));
      if (store.get().exploreChoice?.choices?.['E2-outcome'] !== third) failures.push('E2 Outcome select did not store the choice');
      if (!e2Card.querySelector('.explain-live-text')?.textContent.includes(textOf(third))) failures.push('E2 live sentence does not name the new outcome');
    } finally {
      host.remove();
      store.set(saved);
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.equal(failures.length, 0, failures.join('; '));
  });

  // Phase 4e: every SVG text of the E cards lies inside its own view at 320 px, on the real scan (E1 matrix, E2 curve, E4).
  test('E views texts at 320 px: every SVG text inside its own view on the real scan; store restored', async () => {
    const saved = {
      data: store.get().data,
      parseStats: store.get().parseStats,
      selection: store.get().selection,
      pair: store.get().pair,
      scanResult: store.get().scanResult,
      settings: store.get().settings,
    };
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    try {
      const parsed = parseExport(exportText(synthConfig, {}), parser).data;
      const settings = defaultSettings();
      const scan = await runScan({ data: parsed, settings }, { mode: 'fast', cfg: { ...stats, scanTest: 'stratified' } });
      const event = parsed.labels.find((l) => l.text === EVENT_TEXT).id;
      const outcome = parsed.labels.find((l) => l.text === OUTCOME_TEXT).id;
      store.set({
        data: parsed,
        parseStats: null,
        selection: [event, outcome],
        pair: { window: '1d' },
        scanResult: { rows: scan.rows, meta: scan.meta, data: parsed, settings },
        settings,
      });
      exploreEchoModule.mount(host, {});
      for (const card of host.querySelectorAll('section.card')) {
        const name = card.querySelector('h2').textContent;
        const svg = card.querySelector('svg');
        if (!svg) {
          failures.push(`${name} drew no SVG`);
          continue;
        }
        const viewWidth = svg.viewBox.baseVal.width;
        for (const t of svg.querySelectorAll('text')) {
          const box = t.getBBox();
          if (box.x < -TEXT_TOLERANCE_PX || box.x + box.width > viewWidth + TEXT_TOLERANCE_PX) {
            failures.push(`${name}: "${t.textContent.slice(0, 24)}" at ${Math.round(box.x)} to ${Math.round(box.x + box.width)}, view ${viewWidth}`);
          }
        }
      }
    } finally {
      host.remove();
      store.set(saved);
    }
    assert.equal(failures.length, 0, failures.slice(0, 5).join('; '));
  });

  // The E1 message is long at 320 px (4e.0.2): every text fits the view width and the card does not scroll sideways.
  test('E1 message at 320 px: wrapped lines fit the view width, no sideways scroll of the card; store restored', () => {
    const saved = {
      data: store.get().data,
      parseStats: store.get().parseStats,
      selection: store.get().selection,
      pair: store.get().pair,
      scanResult: store.get().scanResult,
      settings: store.get().settings,
    };
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    try {
      const parsed = parseExport(exportText(synthConfig, {}), parser).data;
      const settings = defaultSettings();
      const event = parsed.labels.find((l) => l.text === EVENT_TEXT).id;
      const outcome = parsed.labels.find((l) => l.text === OUTCOME_TEXT).id;
      store.set({
        data: parsed,
        parseStats: null,
        selection: [event, outcome],
        pair: { window: '1d' },
        scanResult: { rows: [], meta: {}, data: parsed, settings },
        settings,
      });
      exploreEchoModule.mount(host, {});
      const card = host.querySelector('section.card');
      const svg = card.querySelector('svg');
      if (!svg) {
        failures.push('E1 drew no SVG');
      } else {
        const viewWidth = svg.viewBox.baseVal.width;
        const texts = [...svg.querySelectorAll('text')];
        if (texts.length < 2) failures.push(`E1 message has ${texts.length} line(s) at ${WIDTH} px, expected a wrap`);
        for (const t of texts) {
          const w = t.getBBox().width;
          if (w > viewWidth) failures.push(`E1 message text ${Math.round(w)} px wider than the view ${viewWidth} px`);
        }
      }
      if (card.scrollWidth > card.clientWidth) failures.push(`E1 card sideways scroll ${card.scrollWidth} > ${card.clientWidth}`);
    } finally {
      host.remove();
      store.set(saved);
    }
    assert.equal(failures.length, 0, failures.join('; '));
  });
}
