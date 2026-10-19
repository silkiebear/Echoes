// Data loading: one multi-file picker for the tracker export and the settings file, a synthetic sample,
// settings export and clearing. A file is classified by its content (a JSON object is settings), never by name.
// Nothing is uploaded; the card shows counts only.
import { parser } from '../config/parser.js';
import { settingsConfig } from '../config/settings.js';
import { synth } from '../config/synth.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { validateSettings, saveCached, exportSettingsText } from '../core/settings.js';
import { downloadText } from '../core/download.js';
import { missingMoods } from '../core/mood.js';
import { moduleHelp, groupOf } from '../core/module-help.js';
import { moodHint } from '../config/explore.js';
import * as store from '../core/store.js';

const BYTE_ORDER_MARK = /^\uFEFF/;
const SETTINGS_START = '{';

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

function rejectedTotal(stats) {
  if (!stats) return 0;
  return Object.values(stats.rejected).reduce((sum, n) => sum + n, 0);
}

function countRows(state) {
  const d = state.data;
  if (!d) return [['Loaded', 'nothing yet']];
  const range = d.days.length ? `${d.days[0].date} to ${d.days[d.days.length - 1].date}` : 'none';
  return [
    ['Entries', d.entries.length],
    ['Days, first to last', d.days.length],
    ['Date range', range],
    ['Labels', d.labels.length],
    ['Moods', d.moodNames.length],
    ['Rejected rows', rejectedTotal(state.parseStats)],
  ];
}

function renderCounts(list, state) {
  list.replaceChildren();
  for (const [term, value] of countRows(state)) {
    list.append(el('dt', null, term), el('dd', null, String(value)));
  }
}

export default {
  id: 'data-load',
  title: 'Your data',
  phase: 2,
  order: 12,
  mount(container, ctx) {
    container.append(moduleHelp('data-load'));
    const diag = ctx.diag;

    const note = groupOf('what', el('p', 'data-note', 'Files are read in this tab and never uploaded.'));
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.csv,.txt,.json,text/csv,text/plain,application/json';
    const pick = el('label', 'field-label', 'Export or settings files (.csv, .txt, .json)');
    pick.append(input);

    const sampleButton = button('Load synthetic sample (not your data)');
    const exportButton = button('Export settings');
    const clearButton = button('Clear loaded data');
    const row = el('div', 'row');
    row.append(sampleButton, exportButton, clearButton);

    const status = el('p', 'status-line');
    status.setAttribute('role', 'status');
    // Mood order now lives in Tools (phase 4c): this line says where to set it when a loaded mood name has no preset.
    const moodNote = el('p', 'card-sub');
    moodNote.hidden = true;
    const counts = el('dl', 'counts');
    container.append(note, pick, row, status, moodNote, counts);

    function renderMoodHint(state) {
      const pending = Boolean(state.data && state.settings && missingMoods(state.settings, state.data.moodNames).length > 0);
      moodNote.textContent = pending ? moodHint : '';
      moodNote.hidden = !pending;
    }

    function report(message) {
      status.textContent = message;
    }

    function loadSettings(text) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        diag.logStatic('ERROR', 'settings file: not valid JSON');
        return 'The settings file is not valid JSON.';
      }
      const { settings, errors } = validateSettings(parsed);
      if (!settings) {
        diag.log('ERROR', `settings file rejected: ${errors.join('; ')}`);
        return `Settings not loaded: ${errors[0]}`;
      }
      saveCached(settings);
      store.set({ settings });
      diag.logStatic('INFO', 'settings loaded', { notes: errors.length });
      return errors.length ? `Settings loaded with ${errors.length} notes (see diagnostics).` : 'Settings loaded.';
    }

    function loadExport(text) {
      const { data, stats } = parseExport(text, parser);
      diag.setParseStats(stats);
      diag.logStatic('INFO', 'export parsed', { rows: stats.rowsRead, parsed: stats.rowsParsed, ms: stats.parseMs });
      store.set({ data, parseStats: stats });
      if (!data) return 'No date column found. The column names are in the diagnostics.';
      return `Loaded ${data.entries.length} entries.`;
    }

    function loadText(text) {
      const body = text.replace(BYTE_ORDER_MARK, '').trimStart();
      return body.charAt(0) === SETTINGS_START ? loadSettings(body) : loadExport(text);
    }

    async function handleFiles(files) {
      const messages = [];
      for (const file of files) {
        if (file.size > parser.maxFileBytes) {
          diag.logStatic('WARN', 'file rejected: over the size limit', { bytes: file.size });
          messages.push('A file was rejected: it is larger than the size limit.');
          continue;
        }
        try {
          messages.push(loadText(await file.text()));
        } catch {
          diag.logStatic('ERROR', 'file could not be read');
          messages.push('A file could not be read.');
        }
      }
      report(messages.join(' '));
    }

    input.addEventListener('change', () => {
      const files = [...input.files];
      input.value = '';
      handleFiles(files);
    });

    sampleButton.addEventListener('click', () => {
      report(loadText(exportText(synth, {})));
    });

    exportButton.addEventListener('click', () => {
      downloadText(settingsConfig.settingsFileName, exportSettingsText(store.get().settings));
      report('Settings file saved.');
    });

    clearButton.addEventListener('click', () => {
      store.set({ data: null, parseStats: null });
      diag.setParseStats(null);
      report('Loaded data cleared. Settings kept.');
    });

    renderCounts(counts, store.get());
    renderMoodHint(store.get());
    const unsubscribe = store.subscribe((state) => {
      if (!container.isConnected) {
        unsubscribe();
        return;
      }
      renderCounts(counts, state);
      renderMoodHint(state);
    });
  },
};
