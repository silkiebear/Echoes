// Explore: the C1 Days together card and the C2 Combinations card (phase 4h, C1 and C2). Both descriptive only: no
// significance test, no multiple-testing control. Data comes from core\view-data.js through core\explore-kit.js; the
// C1 matrix is drawn by its view, the C2 table is built here from the model of its view.
import { render, pairMost } from '../views/c1-cooccurrence.js';
import { buildTableModel } from '../views/c2-combo-table.js';
import { explore } from '../config/explore.js';
import { combos } from '../config/combos.js';
import { viewSettings } from '../config/views.js';
import * as store from '../core/store.js';
import { makeCard } from '../core/gallery-kit.js';
import { mountSvg, sizeSvg } from '../core/svg.js';
import { coOccurrence } from '../core/cooccurrence.js';
import { combinationTable } from '../core/combos.js';
import { observedOf, selectedIds, fill, messageSvg, setNote, usesNode, setUses } from '../core/explore-kit.js';
import { stringIds, dayLabelIds, textsOf, tooManyLabels } from '../core/explore-card-data.js';
import { formatNumber } from '../core/format.js';
import { cardHelp } from '../core/explain-kit.js';

const ui = explore.ui;

// Help ids of the cards in this module (checked by explore-help.test.js).
export const cardIds = ['C1', 'C2'];

// Label ids in the store are numbers; the matrix and the table take strings (helpers in core\explore-card-data.js).
function daysOf(state) {
  return dayLabelIds(observedOf(state).days);
}

function mountC1(container) {
  const uses = usesNode();
  const help = cardHelp('C1');
  const selected = () => selectedIds(store.get());
  const card = makeCard({
    heading: ui.cooHeading,
    note: ui.descriptive,
    controls: () => [help.help, uses, help.live],
    draw: (width) => draw(width),
  });
  container.append(card.card);

  function draw(width) {
    const s = store.get();
    help.say('');
    setUses(uses, '');
    if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
    const ids = selected();
    if (ids.length === 0) return messageSvg(width, ui.noSelection, ui.tabTitle);
    if (ids.length < 2) return messageSvg(width, ui.cooNeedTwo, ui.cooHeading);
    const idStrings = stringIds(ids);
    const texts = textsOf(s.data.labels, ids);
    const days = daysOf(s);
    const result = coOccurrence(days, idStrings);
    setUses(uses, fill(ui.usesAll, { count: ids.length }));
    setNote(card.card, fill(ui.noteC1, { descriptive: ui.descriptive }) + ' ' + fill(ui.cooLabels, { list: texts.join(ui.listSep) }));
    const pair = pairMost(days, idStrings);
    const i = idStrings.indexOf(pair[0]);
    const j = idStrings.indexOf(pair[1]);
    const count = result.both[i][j];
    help.say(count > 0 ? fill(ui.cooLive, { first: texts[i], second: texts[j], days: formatNumber(count) }) : ui.cooNone);
    return render(result, { texts, width });
  }

  const unsubscribe = store.subscribe(() => {
    if (!container.isConnected) {
      unsubscribe();
      return;
    }
    card.redraw();
  });
  card.redraw();
}

// The C2 table: a DOM table built from the model (textContent only, so label texts never reach markup).
function tableNode(model) {
  const table = document.createElement('table');
  table.className = 'cb-table';
  const head = table.createTHead().insertRow();
  for (const text of model.headers) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    head.append(th);
  }
  const body = table.createTBody();
  for (const row of model.rows) {
    const tr = body.insertRow();
    for (const cell of row.cells) {
      const td = tr.insertCell();
      td.className = cell.cls;
      td.textContent = `${cell.mark} ${cell.word}`;
    }
    const days = tr.insertCell();
    days.append(row.days);
    if (row.badge !== null) {
      const badge = document.createElement('span');
      badge.className = 'cb-badge';
      badge.textContent = row.badge;
      days.append(' ', badge);
    }
    tr.insertCell().textContent = row.share;
  }
  return table;
}

function mountC2(container) {
  const uses = usesNode();
  const help = cardHelp('C2');
  const heading = document.createElement('h2');
  heading.textContent = ui.cbHeading;
  const note = document.createElement('p');
  note.className = 'card-sub';
  note.textContent = fill(ui.noteC2, { descriptive: ui.descriptive });
  const chart = document.createElement('div');
  chart.className = 'chart';
  const scroll = document.createElement('div');
  scroll.className = 'chart-scroll';
  scroll.append(chart);
  const card = document.createElement('section');
  card.className = 'card';
  card.append(heading, note, help.help, uses, help.live, scroll);
  container.append(card);

  function showMessage(width, text) {
    mountSvg(chart, messageSvg(width, text, ui.cbHeading));
    sizeSvg(chart.querySelector('svg'), viewSettings.minWidth);
  }

  function draw() {
    const s = store.get();
    const width = scroll.clientWidth || viewSettings.defaultWidth;
    help.say('');
    setUses(uses, '');
    if (!s.data) return showMessage(width, ui.noData);
    const ids = selectedIds(s);
    if (ids.length === 0) return showMessage(width, ui.noSelection);
    if (tooManyLabels(ids, combos.comboMax)) return showMessage(width, fill(ui.cbMany, { max: combos.comboMax }));
    const texts = textsOf(s.data.labels, ids);
    const result = combinationTable(daysOf(s), stringIds(ids));
    setUses(uses, fill(ui.usesAll, { count: ids.length }));
    const model = buildTableModel(result, texts);
    const summary = document.createElement('p');
    summary.className = 'explore-note';
    summary.textContent = model.summary;
    chart.replaceChildren(summary, tableNode(model));
    const top = result.patterns[0];
    if (!top) {
      help.say(ui.cbNone);
      return;
    }
    const names = texts.filter((_, k) => top.key[k] === '1');
    help.say(fill(ui.cbLive, { names: names.length ? names.join(ui.listSep) : ui.cbNoNames, days: formatNumber(top.count) }));
  }

  const unsubscribe = store.subscribe(() => {
    if (!container.isConnected) {
      unsubscribe();
      return;
    }
    draw();
  });
  draw();
}

export default {
  id: 'explore-combos',
  title: ui.tabTitle,
  phase: 4,
  order: 21,
  mount(container) {
    mountC1(container);
    mountC2(container);
  },
};
