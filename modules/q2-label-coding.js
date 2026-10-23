// Q2 label coding card: how many labels carry a code from the category registry, and the list of labels by
// entries. Possible codes (valid shape, unknown Domain) get a text badge, so the status never relies on colour.
// Text only: every label reaches the page through textContent.
import { classifyLabels, codeStats } from '../core/label-code.js';
import { settingsConfig } from '../config/settings.js';
import { formatPercent } from '../core/format.js';
import * as store from '../core/store.js';
import { moduleHelp } from '../core/module-help.js';

const MAX_ROWS = settingsConfig.q2.maxRows;
const POSSIBLE_TAG = 'possible code, not in registry';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function labelItem(row) {
  const item = el('li');
  item.append(el('span', null, `${row.text}, ${row.entries} entries, ${row.status}`));
  if (row.status === 'possible') {
    item.append(document.createTextNode(' '), el('span', 'badge', POSSIBLE_TAG));
  }
  return item;
}

export default {
  id: 'q2-label-coding',
  title: 'Label coding (Q2)',
  phase: 2,
  order: 15,
  mount(container) {
    container.append(moduleHelp('q2-label-coding'));
    const body = el('div');
    container.append(body);

    function render(state) {
      body.replaceChildren();
      if (!state.data) {
        body.append(el('p', 'status-line', 'No data loaded'));
        return;
      }
      const classified = classifyLabels(state.data.labels, state.settings.categories);
      const s = codeStats(classified, state.data.entries);
      body.append(el('p', null,
        `Coded ${s.coded}, possible ${s.possible}, uncoded ${s.uncoded} of ${s.total} labels. `
        + `Percent uncoded (possible and uncoded): ${formatPercent(s.percentUncoded)}.`));

      const details = el('details');
      const shown = s.list.slice(0, MAX_ROWS);
      details.append(el('summary', null, `Labels by entries (${s.total})`));
      const list = el('ul', 'label-list');
      for (const row of shown) list.append(labelItem(row));
      details.append(list);
      body.append(details);
      if (s.total > shown.length) body.append(el('p', 'data-note', `showing ${shown.length} of ${s.total}`));
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
