// Echo scan card: runs the statistics engine over the loaded export or a synthetic wide sample (in a worker when the
// browser allows) and shows the rows ranked by q. Synthetic sources are not your data. Text only: every label, window
// and pill reaches the page through textContent, so no input string can reach the DOM as markup.
import { startScan } from '../core/stats/client.js';
import { generateWide } from '../core/synth-wide.js';
import { defaultSettings } from '../core/settings.js';
import { formatNumber, formatRatio } from '../core/format.js';
import { windows } from '../config/windows.js';
import { stats } from '../config/stats.js';
import { statsSynth } from '../config/stats-synth.js';
import { viewSettings } from '../config/views.js';
import * as store from '../core/store.js';

const ui = stats.ui;
const PERCENT = 100;
const { diffDigits } = viewSettings.format;

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

function windowText(id) {
  const win = windows.find((w) => w.id === id);
  return win ? win.label : String(id);
}

const pillText = (id) => ui.pillNames[id] || id;

// Small p and q values keep their scale (5e-44 must not print as 0).
function formatP(p) {
  if (p === null) return 'n/a';
  return p < ui.pSciBelow ? p.toExponential(ui.pDigits) : formatNumber(p, ui.pDigits);
}

function summaryText(meta) {
  const s = ui.summary;
  return `${s.cells}: ${formatNumber(meta.cellsTested)} · ${s.discoveries}: ${formatNumber(meta.discoveries)} `
    + `(${s.longRuns}: ${formatNumber(meta.discoveriesLongRuns)}) · ${formatNumber(meta.ms)} ${s.ms} · ${s.runner}: ${meta.runner}`;
}

// Engine order, or (placebo mode) rows with a placebo p first. Both groups keep the engine order; no row is removed.
function sortOrder(rows, mode) {
  const all = rows.map((_, i) => i);
  if (mode !== 'placebo') return all;
  return [...all.filter((i) => rows[i].placeboP !== null), ...all.filter((i) => rows[i].placeboP === null)];
}

function rowEl({ row, rank }, names) {
  const tr = el('tr');
  const pills = el('td');
  for (const [flag, on] of Object.entries(row.flags)) {
    if (on === true) pills.append(el('span', 'scan-pill', pillText(flag)), document.createTextNode(' '));
  }
  if (row.longRuns) pills.append(el('span', 'scan-pill', ui.longRunPill), document.createTextNode(' '));
  if (pills.childNodes.length === 0) pills.textContent = '—';
  tr.append(
    el('td', null, String(rank)),
    el('td', null, names.get(row.exposure) ?? String(row.exposure)),
    el('td', null, names.get(row.outcome) ?? String(row.outcome)),
    el('td', null, windowText(row.window)),
    el('td', null, formatRatio(row.rr)),
    el('td', null, formatNumber(row.diff, diffDigits)),
    el('td', null, formatNumber(row.n)),
    el('td', null, formatP(row.q)),
    el('td', null, formatP(row.placeboP)),
    pills,
  );
  return tr;
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
    const box = el('div', 'scan-box');
    box.append(controls, progress);
    const result = el('div', 'scan-result');
    container.append(box, result);

    let scan = null; // { cancel, done } while a scan runs, else null
    let view = null; // { result, names, sort, limit } after a run, { error: true } after a failed run, else null

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
      result.append(el('p', 'scan-note', summaryText(meta)));
      for (const notice of notices) result.append(el('p', 'scan-notice', pillText(notice)));
      if (meta.discoveriesLongRuns > 0) result.append(el('p', 'scan-note', ui.longRunNote));

      const order = sortOrder(rows, view.sort).map((i) => ({ row: rows[i], rank: i + 1 }));
      const shown = order.slice(0, view.limit);
      const table = el('table', 'scan-table');
      const head = el('thead');
      const headRow = el('tr');
      for (const h of ui.headings) headRow.append(el('th', null, h));
      head.append(headRow);
      const body = el('tbody');
      for (const entry of shown) body.append(rowEl(entry, view.names));
      table.append(head, body);
      const wrap = el('div', 'scan-scroll');
      wrap.append(table);
      result.append(wrap);

      if (order.length > shown.length) {
        const more = button(ui.showMore);
        more.addEventListener('click', () => {
          view.limit = order.length;
          renderResult();
        });
        result.append(more);
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
      result.replaceChildren();
      progress.textContent = ui.running;
      runBtn.disabled = true;
      cancelBtn.disabled = false;
      scan = startScan(input, { mode: modeSel.value }, { progress: onProgress });
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
          names: new Map(input.data.labels.map((l) => [l.id, l.text])),
          sort: sortSel.value,
          limit: ui.pageRows,
        };
        if (!out.meta.cancelled) {
          diag.logStatic('INFO', 'echo scan done', {
            cells: out.meta.cellsTested,
            discoveries: out.meta.discoveries,
            ms: out.meta.ms,
            runner: out.meta.runner,
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
