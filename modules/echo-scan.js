// Echo scan card: runs the statistics engine over the loaded export or a synthetic wide sample (in a worker when the
// browser allows) and shows the rows ranked by q. Synthetic sources are not your data. The default view is plain
// language (core\scan-text.js); the numbers sit behind "Show technical numbers" (phase 4c, 4c.0b). Text only: every
// label, window and pill reaches the page through textContent, so no input string can reach the DOM as markup.
import { startScan } from '../core/stats/client.js';
import { generateWide } from '../core/synth-wide.js';
import { defaultSettings } from '../core/settings.js';
import { windows } from '../config/windows.js';
import { stats } from '../config/stats.js';
import { statsSynth } from '../config/stats-synth.js';
import * as store from '../core/store.js';
import { checkToggle } from '../core/gallery-kit.js';
import { filterControls } from '../core/scan-filter-ui.js';
import { normalizeFilter } from '../core/stats/label-filter.js';
import { describeRow, plainSummary } from '../core/scan-text.js';
import { itemNode, howToNode, groupNode } from '../core/scan-render.js';
import { moduleHelp } from '../core/module-help.js';
import { exploreEcho } from '../config/explore-echo.js';
import { summaryText } from '../core/scan-summary.js';

const ui = stats.ui;
const PERCENT = 100;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text) {
  const node = el('button', null, text);
  node.type = 'button';
  return node;
}

// Options from a { value: text } map, in the map's order.
function selectOf(texts, label) {
  const sel = el('select');
  sel.setAttribute('aria-label', label);
  for (const [value, text] of Object.entries(texts)) {
    const opt = el('option', null, text);
    opt.value = value;
    sel.append(opt);
  }
  return sel;
}

const pillText = (id) => ui.pillNames[id] || id;


// Puts the pair in Explore (4d.4): the selection is the exposure then the outcome, the store keeps the window, and the
// Explore tab is opened. Only for a scan of the loaded export (the synthetic samples are not in the store).
function pairButton(row) {
  const btn = button(exploreEcho.ui.pairButton);
  btn.addEventListener('click', () => {
    store.set({ selection: [row.exposure, row.outcome], pair: { window: row.window } });
    document.getElementById('tab-explore')?.click();
  });
  return btn;
}

// Engine order, or (placebo mode) rows with a placebo p first. Both groups keep the engine order; no row is removed.
export function sortOrder(rows, mode) {
  const all = rows.map((_, i) => i);
  if (mode !== 'placebo') return all;
  return [...all.filter((i) => rows[i].placeboP !== null), ...all.filter((i) => rows[i].placeboP === null)];
}

// A row is flagged when a flag is true (null is not a flag) or its long-run label marks it.
function isFlagged(row) {
  return row.longRuns === true || Object.values(row.flags).some((on) => on === true);
}

// Indices (engine order) of the rows to show. Hiding only filters the display; p, q, flags and order are unchanged.
export function visibleRows(rows, hideFlagged) {
  const all = rows.map((_, i) => i);
  if (!hideFlagged) return all;
  return all.filter((i) => !isFlagged(rows[i]));
}

function fill(text, values) {
  return Object.entries(values).reduce((out, [key, value]) => out.replace(`{${key}}`, String(value)), text);
}

export default {
  id: 'echo-scan',
  title: ui.title,
  phase: 3,
  order: 16,
  mount(container, ctx) {
    const diag = ctx.diag;
    const sourceSel = selectOf(ui.sources, ui.labels.source);
    const modeSel = selectOf(ui.modes, ui.labels.mode);
    const sortSel = selectOf(ui.sortModes, ui.labels.sort);
    const runBtn = button(ui.run);
    const cancelBtn = button(ui.cancel);
    cancelBtn.disabled = true;

    const progress = el('p', 'scan-progress');
    const controls = el('div', 'scan-row');
    controls.append(sourceSel, modeSel, runBtn, cancelBtn, sortSel);
    const sortHelp = el('p', 'scan-help', ui.sortHelp);
    const filterCtl = filterControls(ui.filter);
    const filterHelp = el('p', 'scan-help', ui.filter.help);
    let hideFlagged = false; // display filter; not reset by a new run
    let showTechnical = false; // display only; not reset by a new run
    const hideToggle = checkToggle(ui.hideFlagged, (checked) => {
      hideFlagged = checked;
      renderResult();
    });
    const technicalToggle = checkToggle(ui.technical.toggle, (checked) => {
      showTechnical = checked;
      renderResult();
    });
    const howTo = howToNode(ui);
    const box = el('div', 'scan-box');
    box.append(controls, filterCtl.node, filterHelp, hideToggle, technicalToggle, sortHelp, progress);
    const result = el('div', 'scan-result');
    container.append(moduleHelp('echo-scan'), box, result);

    let scan = null; // { cancel, done } while a scan runs, else null
    let view = null; // { result, labels, sort, limit } after a run, { error: true } after a failed run, else null

    function showNoData() {
      result.replaceChildren(el('p', 'scan-note', ui.noData));
    }

    function renderResult() {
      result.replaceChildren();
      if (!view) return;
      if (view.error) {
        result.append(el('p', 'scan-notice', ui.error));
        return;
      }
      const { meta, notices, rows } = view.result;
      if (meta.cancelled) {
        result.append(el('p', 'scan-notice', ui.cancelled));
        return;
      }
      result.append(howTo);
      // The summary sentences are grouped: the cautions (the limits and the caution line) are "Be careful", the rest
      // "What happened" (4e.2). The text and the order are the same as before.
      const summary = plainSummary(meta, windows, stats);
      const cautions = [stats.ui.plainSummary.limits, stats.ui.plainSummary.caution];
      const note = (sentence) => el('p', 'scan-note', sentence);
      result.append(groupNode('what', ui.groups, summary.filter((s) => !cautions.includes(s)).map(note)));
      result.append(groupNode('care', ui.groups, summary.filter((s) => cautions.includes(s)).map(note)));
      if (showTechnical) result.append(groupNode('numbers', ui.groups, [note(summaryText(meta, ui))]));
      if (meta.filtered !== null) result.append(el('p', 'scan-note', fill(ui.filter.matches, { filtered: meta.filtered })));
      for (const notice of notices) result.append(el('p', 'scan-notice', pillText(notice)));
      if (showTechnical && meta.discoveriesLongRuns > 0) result.append(groupNode('care', ui.groups, [note(ui.longRunNote)]));

      const keep = new Set(visibleRows(rows, hideFlagged));
      const order = sortOrder(rows, view.sort).filter((i) => keep.has(i)).map((i) => ({ row: rows[i], rank: i + 1 }));
      if (rows.length > 0) result.append(el('p', 'scan-note', fill(ui.rowsShown, { shown: order.length, returned: rows.length })));
      if (rows.length > 0 && order.length === 0) {
        result.append(el('p', 'scan-notice', ui.allFlagged));
        return;
      }
      const shown = order.slice(0, view.limit);
      const list = el('div', 'scan-list');
      for (const { row, rank } of shown) {
        const desc = describeRow(row, view.labels, windows, meta, stats, rank);
        const item = itemNode(desc, row, ui, showTechnical);
        if (view.loaded) item.append(pairButton(row));
        list.append(item);
      }
      result.append(list);

      if (order.length > shown.length) {
        const more = button(ui.showMore);
        more.addEventListener('click', () => {
          view.limit = rows.length;
          renderResult();
        });
        result.append(more);
      }
      if (shown.length > ui.pageRows) {
        const less = button(ui.showLess);
        less.addEventListener('click', () => {
          view.limit = ui.pageRows;
          renderResult();
        });
        result.append(less);
      }
    }

    function onProgress(stage, fraction) {
      progress.textContent = `${ui.running}: ${stage} ${Math.round(fraction * PERCENT)}%`;
    }

    function inputFor(source) {
      const state = store.get();
      if (source === 'loaded') return { data: state.data, settings: state.settings };
      const fillers = source === 'wideLarge' ? statsSynth.fillerCountLarge : statsSynth.fillerCount;
      return { data: generateWide(statsSynth, statsSynth.seed, fillers), settings: defaultSettings() };
    }

    async function run() {
      if (scan) return;
      const source = sourceSel.value;
      view = null;
      if (source === 'loaded' && !store.get().data) {
        showNoData();
        return;
      }
      const input = inputFor(source);
      // Register the export's label texts so diagnostics redact them; synthetic labels are not the user's data.
      if (source === 'loaded') {
        for (const label of input.data.labels) diag.register(label.text, 'label');
      }
      // The filter text is user input: register it so diagnostics redact it; the engine never logs it.
      const labelFilter = filterCtl.read();
      if (normalizeFilter(labelFilter, ui.filterMinChars)) diag.register(labelFilter.text, 'label');
      result.replaceChildren();
      progress.textContent = ui.running;
      runBtn.disabled = true;
      cancelBtn.disabled = false;
      scan = startScan(input, { mode: modeSel.value, labelFilter }, { progress: onProgress });
      const out = await scan.done;
      scan = null;
      runBtn.disabled = false;
      cancelBtn.disabled = true;
      progress.textContent = '';

      if (out.error) {
        view = { error: true };
      } else {
        view = {
          result: out,
          labels: input.data.labels,
          sort: sortSel.value,
          limit: ui.pageRows,
          loaded: source === 'loaded',
        };
        if (!out.meta.cancelled && source === 'loaded') {
          store.set({ scanResult: { rows: out.rows, meta: out.meta, data: input.data, settings: input.settings } });
        }
        if (!out.meta.cancelled) {
          const v = out.meta.dayVolume;
          diag.logStatic('INFO', 'echo scan done', {
            cells: out.meta.cellsTested,
            discoveries: out.meta.discoveries,
            up: out.meta.up,
            down: out.meta.down,
            noDirection: out.meta.noDirection,
            untested: out.meta.untested,
            ms: out.meta.ms,
            runner: out.meta.runner,
            volMin: v ? v.min : 0,
            volP10: v ? v.p10 : 0,
            volMedian: v ? v.median : 0,
            volP90: v ? v.p90 : 0,
            volMax: v ? v.max : 0,
            strataBands: out.meta.strata ? out.meta.strata.bands : 0,
          });
        }
      }
      renderResult();
    }

    runBtn.addEventListener('click', run);
    cancelBtn.addEventListener('click', () => {
      if (scan) scan.cancel();
    });
    sortSel.addEventListener('change', () => {
      if (!view || !view.result) return;
      view.sort = sortSel.value;
      renderResult();
    });
    sourceSel.addEventListener('change', () => {
      if (scan) return;
      view = null;
      result.replaceChildren();
      if (sourceSel.value === 'loaded' && !store.get().data) showNoData();
    });

    // Re-check the no-data branch when the loaded export changes; never clobber a running scan or a shown result.
    const unsubscribe = store.subscribe((state) => {
      if (!container.isConnected) {
        unsubscribe();
        return;
      }
      if (scan || view) return;
      if (sourceSel.value === 'loaded' && !state.data) showNoData();
    });
    if (sourceSel.value === 'loaded' && !store.get().data) showNoData();
  },
};
