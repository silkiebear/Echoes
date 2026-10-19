// Explore: label search and selection (phase 4c, 4c.2). The selection is kept in core\store.js (memory only, not saved).
// Text reaches the page through textContent only; a label is never parsed as markup.
import * as store from '../core/store.js';
import { searchLabels, toggleSelection, dayCountsOf } from '../core/selection.js';
import { splitLabel } from '../core/label-code.js';
import { formatNumber } from '../core/format.js';
import { cardHelp } from '../core/explain-kit.js';
import { explore } from '../config/explore.js';

const cfg = explore.selection;
const ui = explore.ui;

// Help ids of the cards in this module (checked by explore-help.test.js).
export const cardIds = ['select'];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text, className) {
  const node = el('button', className, text);
  node.type = 'button';
  return node;
}

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (Object.hasOwn(values, key) ? String(values[key]) : match));
}

export default {
  id: 'explore-select',
  title: ui.selectTitle,
  phase: 4,
  order: 17,
  mount(container) {
    const search = el('input', 'explore-input');
    search.type = 'search';
    search.placeholder = ui.searchPlaceholder;
    search.setAttribute('aria-label', ui.searchLabel);
    const intro = el('p', 'explore-note', ui.descriptive);
    const msg = el('p', 'explore-msg');
    const results = el('div', 'explore-results');
    const chips = el('div', 'explore-chips');
    const clear = button(ui.clear, 'explore-clear');
    const help = cardHelp('select');
    container.append(intro, help.help, search, msg, results, chips, clear);

    let query = '';

    function pick(id) {
      const next = toggleSelection(store.get().selection || [], id, cfg.max);
      store.set({ selection: next });
    }

    function render() {
      const state = store.get();
      const selection = state.selection || [];
      results.replaceChildren();
      chips.replaceChildren();
      const typed = query.normalize('NFC').trim();
      if (!state.data) {
        msg.textContent = ui.noData;
        search.disabled = true;
        clear.hidden = true;
        return;
      }
      search.disabled = false;
      clear.hidden = selection.length === 0;
      const counts = dayCountsOf(state.data);
      let text = '';
      if (typed.length > 0 && typed.length < cfg.minChars) {
        text = fill(ui.tooShort, { min: cfg.minChars });
      } else if (typed.length >= cfg.minChars) {
        const hits = searchLabels(state.data.labels, counts, typed, cfg);
        if (hits.length === 0) text = ui.noMatch;
        for (const hit of hits) results.append(resultButton(hit, selection.includes(hit.id)));
      }
      if (text === '' && selection.length >= cfg.max) text = fill(ui.selectionFull, { max: cfg.max });
      if (text === '' && selection.length === 0) text = fill(ui.selectionEmpty, { max: cfg.max });
      msg.textContent = text;
      for (const id of selection) {
        const label = state.data.labels[id];
        // A selection made on earlier data can point past the labels of newly loaded data; such ids are skipped.
        if (label) chips.append(chipNode(label.text, id));
      }
    }

    function resultButton(hit, selected) {
      const { name, code } = splitLabel(hit.text);
      const btn = button('', 'explore-result');
      btn.setAttribute('aria-pressed', String(selected));
      btn.append(el('span', 'explore-result-text', name || hit.text));
      const meta = [fill(ui.resultDays, { days: formatNumber(hit.days) })];
      if (code !== null) meta.unshift(fill(ui.codeLabel, { code }));
      btn.append(el('span', 'explore-result-meta', meta.join(' · ')));
      btn.addEventListener('click', () => pick(hit.id));
      return btn;
    }

    function chipNode(text, id) {
      const chip = el('span', 'explore-chip');
      chip.append(el('span', 'explore-chip-text', text));
      const remove = button(ui.chipRemove, 'explore-chip-remove');
      remove.setAttribute('aria-label', `${ui.chipRemove}: ${text}`);
      remove.addEventListener('click', () => pick(id));
      chip.append(remove);
      return chip;
    }

    search.addEventListener('input', () => {
      query = search.value;
      render();
    });
    clear.addEventListener('click', () => store.set({ selection: [] }));

    const unsubscribe = store.subscribe(() => {
      if (!container.isConnected) {
        unsubscribe();
        return;
      }
      render();
    });
    render();
  },
};
