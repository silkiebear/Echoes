// Explore: the M1 Mood and this label card (phase 4h, M1). Descriptive only: the mean mood on observed days with and
// without one selected label, and a range for the difference from a seeded block bootstrap (core\mood-influence.js). The
// sentence and the table come from the model of views\m1-mood-card.js; the DOM is built here with textContent only.
import { buildMoodModel } from '../views/m1-mood-card.js';
import { explore } from '../config/explore.js';
import { stats } from '../config/stats.js';
import { moodInfluenceConfig } from '../config/mood-influence.js';
import * as store from '../core/store.js';
import { moodInfluence } from '../core/mood-influence.js';
import { checkToggle, selectControl } from '../core/gallery-kit.js';
import { observedOf, selectedIds, choiceOf, setChoice, fill, usesNode, setUses } from '../core/explore-kit.js';
import { cardHelp } from '../core/explain-kit.js';
import { formatNumber } from '../core/format.js';
import { dayLabelIds, presentFor, moodFor, tooFewResult, activePeriod } from '../core/explore-card-data.js';

const ui = explore.ui;

// Help ids of the cards in this module (checked by explore-help.test.js).
export const cardIds = ['M1'];

function noteNode(text) {
  const node = document.createElement('p');
  node.className = 'explore-note';
  node.textContent = text;
  return node;
}

// The table of the model: headers and rows are strings, drawn with textContent.
function tableNode(table) {
  const node = document.createElement('table');
  node.className = 'mi-table';
  const head = node.createTHead().insertRow();
  for (const text of table.headers) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    head.append(th);
  }
  const body = node.createTBody();
  for (const row of table.rows) {
    const tr = body.insertRow();
    for (const text of row) tr.insertCell().textContent = text;
  }
  return node;
}

function mountM1(container) {
  const uses = usesNode();
  const help = cardHelp('M1');
  const heading = document.createElement('h2');
  heading.textContent = ui.miHeading;
  const note = document.createElement('p');
  note.className = 'card-sub';
  note.textContent = ui.noteM1;
  const controls = document.createElement('div');
  controls.className = 'explore-controls';
  // The active period line sits under the Label select (phase 4h.3b).
  const periodNote = noteNode('');
  periodNote.hidden = true;
  const body = document.createElement('div');
  body.className = 'chart-scroll';
  const numbers = noteNode('');
  numbers.hidden = true;
  // Display only: the technical line follows the toggle and is kept across redraws (as in echo-scan.js).
  let showTechnical = false;
  const technical = checkToggle(stats.ui.technical.toggle, (checked) => {
    showTechnical = checked;
    numbers.hidden = !showTechnical;
  });
  const card = document.createElement('section');
  card.className = 'card';
  card.append(heading, note, help.help, uses, controls, periodNote, help.live, body, technical, numbers);
  container.append(card);

  function message(text) {
    body.replaceChildren(noteNode(text));
  }

  function draw() {
    const s = store.get();
    help.say('');
    setUses(uses, '');
    controls.replaceChildren();
    body.replaceChildren();
    numbers.textContent = '';
    periodNote.hidden = true;
    periodNote.textContent = '';
    if (!s.data) return message(ui.noData);
    const ids = selectedIds(s);
    if (ids.length === 0) return message(ui.noSelection);
    const id = choiceOf(s, 'M1', ids[0]);
    const text = s.data.labels[id].text;
    controls.append(selectControl(ui.labelLabel, ids.map((x) => ({ value: String(x), label: s.data.labels[x].text })), String(id), (value) => {
      setChoice('M1', Number(value));
    }));
    // Only the active period of the label is compared: from its first to its last observed day (phase 4h.3b).
    const days = observedOf(s).days;
    const period = activePeriod(presentFor(dayLabelIds(days), String(id)), moodFor(days), days);
    if (period.used > 0) {
      const first = period.days[0].date;
      const last = period.days[period.days.length - 1].date;
      const values = { used: formatNumber(period.used), label: text, first, last, excluded: formatNumber(period.excluded) };
      periodNote.textContent = fill(period.excluded === 0 ? ui.miPeriodAll : ui.miPeriod, values);
      periodNote.hidden = false;
    }
    // moodInfluence needs at least one block of observed days; a shorter period has no range to give.
    const result = period.days.length >= moodInfluenceConfig.blockLength
      ? moodInfluence(period.present, period.mood, moodInfluenceConfig)
      : tooFewResult(period.present, moodInfluenceConfig.blockLength, moodInfluenceConfig.level);
    const model = buildMoodModel(result, text);
    setUses(uses, fill(ui.usesOne, { label: text }));
    help.say(model.sentence);
    if (model.table !== null) body.append(tableNode(model.table));
    numbers.textContent = model.numbersLine;
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
  id: 'explore-mood',
  title: ui.tabTitle,
  phase: 4,
  order: 22,
  mount(container) {
    mountM1(container);
  },
};
