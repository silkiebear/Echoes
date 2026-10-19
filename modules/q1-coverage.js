// Q1 coverage card: range, days and entries, tracker days, low-completeness days, the by-year split and the
// time-of-day pill (same wording as the P1 view). Text only: every value reaches the page through textContent.
import { buildQuality } from '../core/quality.js';
import { settingsConfig } from '../config/settings.js';
import { timeDiversity as diversityFlags } from '../config/flags.js';
import { viewSettings } from '../config/views.js';
import { formatPercent } from '../core/format.js';
import * as store from '../core/store.js';
import { moduleHelp, groupOf } from '../core/module-help.js';

const CFG = { completeness: settingsConfig.completeness, diversity: diversityFlags };
const PERIODIC = viewSettings.time.periodic;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function summaryTable(q) {
  const rows = [
    ['Range', q.range ? `${q.range.from} to ${q.range.to}` : 'none'],
    ['Days in range', String(q.spanDays)],
    ['Days with entries', String(q.daysWithEntries)],
    ['Entries', String(q.entries)],
    ['Entries without time', String(q.entriesNoTime)],
    ['Tracker days', q.trackerDays === null ? 'tracker label not set' : String(q.trackerDays)],
    ['Median marks per day', String(q.medianMarks)],
    ['Low-completeness days', `${q.lowCompletenessDays} (${formatPercent(q.lowCompletenessShare)})`],
  ];
  const table = el('table', 'quality');
  const body = el('tbody');
  for (const [term, value] of rows) {
    const tr = el('tr');
    // Values without a space are numbers or dates: they do not wrap (the table scrolls inside .table-wrap instead).
    tr.append(el('th', null, term), el('td', /\s/.test(value) ? null : 'num', value));
    body.append(tr);
  }
  table.append(body);
  return table;
}

function yearTable(byYear) {
  const table = el('table', 'quality');
  const head = el('tr');
  for (const title of ['Year', 'Days', 'Days with entries', 'Entries']) head.append(el('th', null, title));
  const thead = el('thead');
  thead.append(head);
  const body = el('tbody');
  for (const row of byYear) {
    const tr = el('tr');
    tr.append(el('td', 'num', row.year), el('td', 'num', String(row.days)),
      el('td', 'num', String(row.daysWithEntries)), el('td', 'num', String(row.entries)));
    body.append(tr);
  }
  table.append(thead, body);
  return table;
}

export default {
  id: 'q1-coverage',
  title: 'Coverage (Q1)',
  phase: 2,
  order: 14,
  mount(container) {
    container.append(moduleHelp('q1-coverage'));
    const note = groupOf('what', el('p', 'data-note', 'How much of the export is usable: days, entries and marks per day.'));
    const body = el('div', 'table-wrap');
    container.append(note, body);

    function render(state) {
      body.replaceChildren();
      if (!state.data) {
        body.append(el('p', 'status-line', 'No data loaded'));
        return;
      }
      const q = buildQuality(state.data, state.settings, CFG);
      body.append(summaryTable(q));
      if (q.timeDiversity.low) {
        const pillLine = el('p');
        pillLine.append(el('span', 'pill-html', PERIODIC.pillText));
        body.append(pillLine, el('p', 'data-note', PERIODIC.pillExplain));
      }
      body.append(el('h3', null, 'By year'), yearTable(q.byYear));
    }

    const unsubscribe = store.subscribe((state) => {
      if (!container.isConnected) {
        unsubscribe();
        return;
      }
      render(state);
    });
    render(store.get());
  },
};
