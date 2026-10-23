// Explore card modules, contract (phase 4h, step 5b; browser only, skipped in Node). The C1, C2 and M1 cards are mounted
// the way the app mounts them, with the synthetic export and three selected labels. Checked: no throw; a card element in
// the container; the heading text from the config; the module order after every older Explore module; the C2 row count
// equal to a naive count; a redraw after a selection change. Lesson of 4h.1 and 4h.2: the wiring defects (a card object
// instead of its node, numeric ids, a wrong order) were found only in Chromium. The store is restored afterwards.
import { test, skip, assert } from '../core/harness.js';
import * as store from '../core/store.js';
import { observedOf } from '../core/explore-kit.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { defaultSettings } from '../core/settings.js';
import { synth as synthConfig } from '../config/synth.js';
import { parser } from '../config/parser.js';
import { explore } from '../config/explore.js';
import { moodInfluenceConfig } from '../config/mood-influence.js';
import { formatNumber } from '../core/format.js';
import * as selectMod from '../modules/explore-select.js';
import * as timeMod from '../modules/explore-time.js';
import * as periodicMod from '../modules/explore-periodic.js';
import * as echoMod from '../modules/explore-echo.js';
import * as combosMod from '../modules/explore-combos.js';
import * as moodMod from '../modules/explore-mood.js';

const OLDER = [selectMod, timeMod, periodicMod, echoMod, combosMod];
const NEW_MODULE = moodMod;
const LABEL_COUNT = 3;

// The distinct day patterns of the selection, counted with one loop over the observed days (not the core function).
function naiveRows(days, ids) {
  const keys = new Set();
  for (const day of days) keys.add(ids.map((id) => (day.labels.includes(id) ? '1' : '0')).join(''));
  return keys.size;
}

if (typeof document === 'undefined') {
  skip('explore cards: C1, C2 and M1 mount, order, headings, C2 rows, redraw; store restored', 'browser only');
} else {
  test('explore cards: C1, C2 and M1 mount, order, headings, C2 rows and redraw; store restored', () => {
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
    document.body.append(host);
    const failures = [];
    const boxes = new Map();
    try {
      const parsed = parseExport(exportText(synthConfig, {}), parser).data;
      const ids = parsed.labels.slice(0, LABEL_COUNT).map((l) => l.id);
      store.set({ data: parsed, parseStats: null, selection: ids, pair: { window: '1d' }, scanResult: null, settings: defaultSettings(), exploreChoice: null });

      for (const mod of [...OLDER, NEW_MODULE]) {
        const box = document.createElement('div');
        host.append(box);
        boxes.set(mod.default.id, box);
        try {
          mod.default.mount(box, {});
        } catch (error) {
          failures.push(`${mod.default.id} mount threw ${error.name}`);
        }
      }

      for (const mod of OLDER) {
        if (!(NEW_MODULE.default.order > mod.default.order)) {
          failures.push(`${NEW_MODULE.default.id} order ${NEW_MODULE.default.order} is not after ${mod.default.id} (${mod.default.order})`);
        }
      }

      // The older modules (select, time, periodic, echo) are not checked for cards: explore-select draws no card.
      for (const id of [combosMod.default.id, NEW_MODULE.default.id]) {
        const box = boxes.get(id);
        if (!box.querySelector('section.card')) failures.push(`${id}: no card element in its container`);
        if (box.textContent.includes('[object Object]')) failures.push(`${id}: an object was appended as text`);
      }

      const headings = [...host.querySelectorAll('section.card h2')].map((h) => h.textContent);
      for (const want of [explore.ui.cooHeading, explore.ui.cbHeading, explore.ui.miHeading]) {
        if (!headings.includes(want)) failures.push(`no card with heading ${want}; headings found: ${headings.length}`);
      }

      const rowsOf = (box) => box.querySelector('table.cb-table')?.tBodies[0]?.rows.length ?? -1;
      const days = observedOf(store.get()).days;
      const combosBox = boxes.get(combosMod.default.id);
      if (rowsOf(combosBox) !== naiveRows(days, ids)) {
        failures.push(`C2 rows ${rowsOf(combosBox)}, naive count ${naiveRows(days, ids)}`);
      }

      const pair = [ids[2], ids[0]];
      try {
        store.set({ selection: pair });
      } catch (error) {
        failures.push(`selection change threw ${error.name}`);
      }
      const selectOptions = boxes.get(NEW_MODULE.default.id).querySelectorAll('select option').length;
      if (selectOptions !== pair.length) failures.push(`M1 select has ${selectOptions} options after the change, want ${pair.length}`);
      if (rowsOf(combosBox) !== naiveRows(observedOf(store.get()).days, pair)) {
        failures.push(`C2 rows after the change ${rowsOf(combosBox)}, naive count ${naiveRows(observedOf(store.get()).days, pair)}`);
      }
    } finally {
      store.set(saved);
      host.remove();
    }
    assert.ok(failures.length === 0, failures.join('; '));
  });

  // M1 active period (phase 4h.3b). Each case copies the sample data (the sample module is never edited), sets the store,
  // mounts the M1 card, reads the card and restores the store in a finally block, then asserts the restore.
  const KEYS = ['data', 'parseStats', 'selection', 'pair', 'scanResult', 'settings', 'exploreChoice'];
  const sampleData = () => parseExport(exportText(synthConfig, {}), parser).data;
  const sampleIds = (data) => data.labels.slice(0, LABEL_COUNT).map((l) => l.id);

  // Mounts the M1 card with the data and the selection, passes its node to check, restores the store.
  function withStore(data, ids, check) {
    const saved = {};
    for (const key of KEYS) saved[key] = store.get()[key];
    const host = document.createElement('section');
    document.body.append(host);
    try {
      store.set({ data, parseStats: null, selection: ids, pair: { window: '1d' }, scanResult: null, settings: defaultSettings(), exploreChoice: null });
      const box = document.createElement('div');
      host.append(box);
      NEW_MODULE.default.mount(box, {});
      check(box.querySelector('section.card'));
    } finally {
      store.set(saved);
      host.remove();
    }
    assert.ok(store.get().data === saved.data, 'the store data is restored after the case');
  }

  // The text of the period line (the note that starts with "Days used:"), or null when it is not shown.
  function periodLine(card) {
    return [...card.querySelectorAll('p.explore-note')].map((p) => p.textContent).find((t) => t.startsWith('Days used:')) ?? null;
  }

  // The count in the last parentheses of a table cell, such as "With X (713 days)": digits only, so separators drop out.
  function countOf(text) {
    const m = /\(([^()]*) days\)$/.exec(text);
    return m ? Number(m[1].replace(/\D/g, '')) : NaN;
  }

  // The first and last observed day with the label, and the counts, by one loop over the days (not the module's helpers).
  function naivePeriod(days, id) {
    let first = -1;
    let last = -1;
    let n1 = 0;
    days.forEach((day, i) => {
      if (day.labels.map(String).includes(String(id))) {
        if (first === -1) first = i;
        last = i;
        n1 += 1;
      }
    });
    const used = first === -1 ? 0 : last - first + 1;
    return { first, last, used, excluded: days.length - used, n1 };
  }

  const tooFewText = explore.ui.miTooFew.replace('{min}', formatNumber(moodInfluenceConfig.minPerGroup));

  test('explore M1 contract (a): the active period line and the table counts match a naive count (sample, 3 labels)', () => {
    const data = sampleData();
    const ids = sampleIds(data);
    withStore(data, ids, (card) => {
      const days = observedOf(store.get()).days;
      const want = naivePeriod(days, ids[0]);
      const line = periodLine(card);
      assert.ok(line !== null, 'a period line is shown');
      assert.ok(line.includes(`Days used: ${formatNumber(want.used)}`), `the days used ${want.used}: ${line}`);
      assert.ok(line.includes(days[want.first].date) && line.includes(days[want.last].date), 'the first and last day dates');
      if (want.excluded > 0) assert.ok(line.includes(`Observed days left out (outside this period): ${formatNumber(want.excluded)}`), 'the days left out');
      else assert.ok(line.includes('No observed days are left out'), 'no day left out');
      const rows = card.querySelectorAll('table.mi-table tbody tr');
      const n1 = countOf(rows[0].cells[0].textContent);
      const n0 = countOf(rows[1].cells[0].textContent);
      assert.equal(n1, want.n1, 'days with the label in the table');
      assert.ok(n1 + n0 <= want.used, `table counts ${n1} + ${n0} not larger than the ${want.used} days used`);
    });
  });

  test('explore M1 contract (b): excluded days, the label removed from the first 10 observed days of a copy', () => {
    const data = structuredClone(sampleData());
    const ids = sampleIds(data);
    const id = ids[0];
    let seen = 0;
    for (const day of data.days) {
      if (day.entryCount <= 0) continue;
      if (seen === 10) break;
      seen += 1;
      day.labels = day.labels.filter((l) => String(l) !== String(id));
    }
    withStore(data, ids, (card) => {
      const want = naivePeriod(observedOf(store.get()).days, id);
      assert.ok(want.excluded >= 10, `the first 10 observed days are left out (got ${want.excluded})`);
      const line = periodLine(card);
      assert.ok(line !== null, 'a period line is shown');
      assert.ok(line.includes(`Days used: ${formatNumber(want.used)}`), `the days used ${want.used}: ${line}`);
      assert.ok(line.includes(`Observed days left out (outside this period): ${formatNumber(want.excluded)}`), `the days left out ${want.excluded}: ${line}`);
    });
  });

  test('explore M1 contract (c): too few days, the not-enough message and no table (copy with one block less)', () => {
    const data = structuredClone(sampleData());
    const ids = sampleIds(data);
    const keep = moodInfluenceConfig.blockLength - 1;
    let seen = 0;
    for (const day of data.days) {
      if (day.entryCount <= 0) continue;
      seen += 1;
      if (seen > keep) day.entryCount = 0;
    }
    withStore(data, ids, (card) => {
      assert.ok(card.textContent.includes(tooFewText), 'the not-enough message from the config');
      assert.equal(card.querySelector('table.mi-table'), null, 'no table');
    });
  });

  test('explore M1 contract (d): no day with the label, no period line and the not-enough message (copy)', () => {
    const data = structuredClone(sampleData());
    const ids = sampleIds(data);
    const id = ids[0];
    for (const day of data.days) day.labels = day.labels.filter((l) => String(l) !== String(id));
    withStore(data, ids, (card) => {
      assert.equal(naivePeriod(observedOf(store.get()).days, id).used, 0, 'the naive count has no day');
      assert.equal(periodLine(card), null, 'no period line');
      assert.ok(card.textContent.includes(tooFewText), 'the not-enough message from the config');
    });
  });
}
