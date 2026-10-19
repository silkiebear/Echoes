// Explore: the E views on your data (phase 4d, 4d.4; uniform label rule 4f.2). The event is the first selected label unless
// the Event select says otherwise; E2 also has an Outcome select (default: the second selected label). E1 and E4 compare the
// event with the other selected labels (at most exploreEcho.maxOutcomes). E1: outcomes by window for the event (from the last
// Echo scan rows). E2: the curve with its band for the pair. E4: before and after the event. Descriptive only; a check for
// chance is shown only for a pair in the last scan result.
import { views } from '../views/index.js';
import { explore } from '../config/explore.js';
import { exploreEcho } from '../config/explore-echo.js';
import { viewSettings } from '../config/views.js';
import { stats } from '../config/stats.js';
import { windows } from '../config/windows.js';
import * as store from '../core/store.js';
import { makeCard, selectControl } from '../core/gallery-kit.js';
import { viewDataFor, selectedIds, fill, messageSvg, setNote, choiceOf, setChoice, usesNode, setUses } from '../core/explore-kit.js';
import { buildE1Real, buildE2Real, buildE4Real } from '../core/echo-real.js';
import { describeRow } from '../core/scan-text.js';
import { prepare } from '../core/stats/prepare.js';
import { cardHelp } from '../core/explain-kit.js';
import { liveSentence } from '../core/explore-live.js';

const ui = exploreEcho.ui;
const E = explore.ui;

// Help ids of the cards in this module (checked by explore-help.test.js).
export const cardIds = ['E1', 'E2', 'E4'];

function viewById(id) {
  return views.find((v) => v.id === id);
}

// The scan result counts only when it was run on the data that is loaded now (its data object is the store's).
function scanFor(s) {
  const r = s.scanResult;
  if (!r) return { none: ui.noScan };
  if (r.data !== s.data) return { none: ui.staleScan };
  return { result: r };
}

// The scan row for the pair; the pair's window when the user picked one from the scan, otherwise the first row.
function rowFor(scan, exposure, outcome, windowId) {
  const rows = scan.rows.filter((r) => r.exposure === exposure && r.outcome === outcome);
  return rows.find((r) => r.window === windowId) ?? rows[0] ?? null;
}

// The event of a card: its Event select, or the first selected label.
function eventOf(s, cardId, ids) {
  return choiceOf(s, cardId, ids[0]);
}

// E1 and E4 outcomes: the other selected labels, in selection order, at most exploreEcho.maxOutcomes.
export function outcomesOf(ids, event) {
  return ids.filter((id) => id !== event).slice(0, exploreEcho.maxOutcomes);
}

// E2 outcome: its Outcome select when that is a selected label other than the event; else the first other label.
export function outcomeOf(s, event, ids) {
  const fallback = ids.find((id) => id !== event);
  const outcome = choiceOf(s, 'E2-outcome', fallback);
  return outcome === event ? fallback : outcome;
}

function textsOf(s, ids) {
  return ids.map((id) => s.data.labels[id].text).join(E.usesJoin);
}

function labelSelect(text, s, ids, value, cardId, exclude = null) {
  const options = ids.filter((id) => id !== exclude).map((id) => ({ value: String(id), label: s.data.labels[id].text }));
  return selectControl(text, options, String(value), (v) => setChoice(cardId, Number(v)));
}

function controlsDiv() {
  const node = document.createElement('div');
  node.className = 'explore-controls';
  return node;
}

export default {
  id: 'explore-echo',
  title: 'Echo views',
  phase: 4,
  order: 20,
  mount(container) {
    const cards = [];
    let prepared = { data: null, value: null };

    function preparedFor(s) {
      if (prepared.data !== s.data) prepared = { data: s.data, value: prepare({ data: s.data, settings: s.settings }) };
      return prepared.value;
    }

    const e1 = viewById('E1');
    const e1Help = cardHelp('E1');
    const e1Uses = usesNode();
    const e1Controls = controlsDiv();
    const e1Card = makeCard({
      heading: exploreEcho.ui.e1.heading,
      note: E.descriptive,
      controls: () => [e1Help.help, e1Uses, e1Controls, e1Help.live],
      draw: (width) => {
        const s = store.get();
        e1Help.say('');
        setUses(e1Uses, '');
        const ids = selectedIds(s);
        if (!s.data || ids.length < 2) return messageSvg(width, ui.noTwo, E.tabTitle);
        const event = eventOf(s, 'E1', ids);
        const eventText = s.data.labels[event].text;
        const outcomes = outcomesOf(ids, event);
        setUses(e1Uses, fill(E.usesEventOutcomes, { event: eventText, list: textsOf(s, outcomes) }));
        const scan = scanFor(s);
        if (scan.none) return messageSvg(width, scan.none, E.tabTitle);
        setNote(e1Card.card, fill(ui.e1.note, { event: eventText }));
        if (!scan.result.rows.some((r) => r.exposure === event)) return messageSvg(width, fill(ui.noRowsForEvent, { event: eventText }), E.tabTitle);
        const matrix = buildE1Real(scan.result, s.data.labels, windows, event, outcomes);
        e1Help.say(liveSentence('E1', matrix, [eventText]));
        return e1.render(matrix, { width });
      },
    });
    cards.push(e1Card);

    const e2 = viewById('E2');
    const e2Help = cardHelp('E2');
    const e2Uses = usesNode();
    const e2Controls = controlsDiv();
    const e2Card = makeCard({
      heading: exploreEcho.ui.e2.heading,
      note: E.descriptive,
      controls: () => [e2Help.help, e2Uses, e2Controls, e2Help.live],
      draw: (width) => {
        const s = store.get();
        e2Help.say('');
        setUses(e2Uses, '');
        const ids = selectedIds(s);
        if (!s.data || ids.length < 2) return messageSvg(width, ui.noTwo, E.tabTitle);
        const event = eventOf(s, 'E2', ids);
        const outcome = outcomeOf(s, event, ids);
        const labels = s.data.labels;
        const scan = scanFor(s);
        let check = scan.none ?? ui.notInScan;
        if (scan.result) {
          const row = rowFor(scan.result, event, outcome, s.pair?.window);
          if (row) check = fill(ui.inScan, { verdict: describeRow(row, labels, windows, scan.result.meta, stats).verdict });
        }
        const cfg = {
          days: viewSettings.curve.days,
          shuffles: stats.placebo.shuffles.fast,
          seed: stats.placebo.seed,
          labels,
          statsCfg: stats,
        };
        const caption = fill(exploreEcho.ui.e2.caption, { shuffles: cfg.shuffles });
        const data = buildE2Real(preparedFor(s), event, outcome, cfg);
        setUses(e2Uses, fill(E.usesEventOutcome, { event: labels[event].text, outcome: labels[outcome].text }));
        setNote(e2Card.card, `${check} ${fill(ui.e2.note, { event: data.eventLabel, outcome: data.outcomeLabel })}`);
        e2Help.say(liveSentence('E2', data));
        return e2.render(data, { width, caption, desc: exploreEcho.ui.e2.desc });
      },
    });
    cards.push(e2Card);

    const e4 = viewById('E4');
    const e4Help = cardHelp('E4');
    const e4Uses = usesNode();
    const e4Controls = controlsDiv();
    const e4Card = makeCard({
      heading: exploreEcho.ui.e4.heading,
      note: E.descriptive,
      controls: () => [e4Help.help, e4Uses, e4Controls, e4Help.live],
      draw: (width) => {
        const s = store.get();
        e4Help.say('');
        setUses(e4Uses, '');
        const ids = selectedIds(s);
        if (!s.data || ids.length < 2) return messageSvg(width, ui.noTwo, E.tabTitle);
        const event = eventOf(s, 'E4', ids);
        const eventText = s.data.labels[event].text;
        const outcomes = outcomesOf(ids, event);
        const picked = windows.find((w) => w.id === s.pair?.window);
        const days = picked ? picked.days : viewSettings.eventStudy.defaultWindow;
        const data = buildE4Real(viewDataFor(s), event, days, outcomes);
        setNote(e4Card.card, fill(ui.e4.note, { event: eventText, window: days }));
        setUses(e4Uses, fill(E.usesEventOutcomes, { event: eventText, list: textsOf(s, outcomes) }));
        e4Help.say(liveSentence('E4', data));
        if (data.nEvents === 0) return messageSvg(width, fill(ui.noEvents, { event: eventText }), E.tabTitle);
        return e4.render(data, { width });
      },
    });
    cards.push(e4Card);

    for (const { card } of cards) container.append(card);

    // The selects follow the selection: they are offered only when a card can draw (two or more labels).
    function fillControls() {
      const s = store.get();
      const ids = selectedIds(s);
      const show = s.data && ids.length >= 2;
      const event2 = show ? eventOf(s, 'E2', ids) : null;
      e1Controls.replaceChildren(...(show ? [labelSelect(E.eventSelect, s, ids, eventOf(s, 'E1', ids), 'E1')] : []));
      e2Controls.replaceChildren(...(show ? [
        labelSelect(E.eventSelect, s, ids, event2, 'E2'),
        labelSelect(E.outcomeSelect, s, ids, outcomeOf(s, event2, ids), 'E2-outcome', event2),
      ] : []));
      e4Controls.replaceChildren(...(show ? [labelSelect(E.eventSelect, s, ids, eventOf(s, 'E4', ids), 'E4')] : []));
    }

    function refresh() {
      fillControls();
      for (const c of cards) c.redraw();
    }

    const unsubscribe = store.subscribe(() => {
      if (!container.isConnected) {
        unsubscribe();
        return;
      }
      refresh();
    });
    refresh();
  },
};
