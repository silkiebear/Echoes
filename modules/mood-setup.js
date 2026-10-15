// Mood setup: when the loaded data has moods without a saved order, asks for one tap per mood (best first).
// The saved order drives the M2 preview. Redo order asks for the taps again.
import { settingsConfig } from '../config/settings.js';
import { viewSettings } from '../config/views.js';
import { applyOrder, missingMoods, orderFromTaps } from '../core/mood.js';
import { saveCached } from '../core/settings.js';
import { mountSvg } from '../core/svg.js';
import * as store from '../core/store.js';
import { views } from '../views/index.js';

const M2 = views.find((view) => view.id === 'M2');

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

export default {
  id: 'mood-setup',
  title: 'Mood order',
  phase: 2,
  order: 13,
  mount(container) {
    // The module keeps no reference to the container except to tell whether it is still on the page.
    const ui = { taps: [], redo: false };

    const note = el('p', 'data-note');
    const tapRow = el('div', 'row');
    const actions = el('div', 'row');
    const preview = el('div');
    const status = el('p', 'status-line');
    status.setAttribute('role', 'status');
    container.append(note, tapRow, actions, preview, status);

    function drawPreview(settings) {
      if (settings.moods.length === 0) return;
      const width = preview.clientWidth || viewSettings.defaultWidth;
      mountSvg(preview, M2.render({ moods: settings.moods }, { width }));
    }

    function tapButton(name, order) {
      const node = button(order === undefined ? name : `${order}. ${name}`);
      node.setAttribute('aria-pressed', String(order !== undefined));
      node.addEventListener('click', () => {
        if (!ui.taps.includes(name)) ui.taps.push(name);
        render();
      });
      return node;
    }

    function saveOrder(names) {
      const settings = store.get().settings;
      const ordered = orderFromTaps(names, ui.taps);
      const moods = applyOrder(settings, ordered, settingsConfig.moodPalette);
      const next = { ...settings, moods };
      saveCached(next);
      ui.taps = [];
      ui.redo = false;
      status.textContent = 'Order saved.';
      store.set({ settings: next });
    }

    function renderTapping(names, missing) {
      note.textContent = (missing.length ? 'New moods in the data. ' : '')
        + 'Tap every mood from best to worst. Each mood can be tapped once.';
      const ordered = orderFromTaps(names, ui.taps);
      for (const name of names) {
        const entry = ordered.find((o) => o.name === name);
        tapRow.append(tapButton(name, entry ? entry.order : undefined));
      }
      const reset = button('Reset taps');
      reset.addEventListener('click', () => {
        ui.taps = [];
        render();
      });
      const save = button('Save order');
      save.disabled = ordered.length !== names.length;
      save.addEventListener('click', () => saveOrder(names));
      actions.append(reset, save);
    }

    function renderSaved() {
      note.textContent = 'Moods are ordered best to worst. Redo the order if the mood names in your data changed.';
      const redo = button('Redo order');
      redo.addEventListener('click', () => {
        ui.redo = true;
        ui.taps = [];
        render();
      });
      actions.append(redo);
    }

    function render() {
      const { data, settings } = store.get();
      tapRow.replaceChildren();
      actions.replaceChildren();
      preview.replaceChildren();
      if (!data) {
        note.textContent = 'Load data first. The mood order is set from the moods in the data.';
        drawPreview(settings);
        return;
      }
      const names = [...new Set(data.moodNames)];
      const missing = missingMoods(settings, names);
      if (ui.redo || missing.length > 0) {
        renderTapping(names, missing);
      } else {
        renderSaved();
      }
      drawPreview(settings);
    }

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
