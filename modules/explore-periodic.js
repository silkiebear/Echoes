// Explore: the periodic views P1 to P4 on your data (phase 4c, 4c.3; labels uniform in 4f.2). P1 weekday by clock hour (one
// label or all), P2 hour dial (one label as wedges, or the selection as rings), P3 weekday profile and P4 month profile (one
// label each, observed days). Descriptive only. The low time-of-day diversity pill comes from the existing flag code, on the
// timed entries of the view. Each card names the label or labels it draws in its "Uses:" line.
import { views } from '../views/index.js';
import { viewSettings } from '../config/views.js';
import { explore } from '../config/explore.js';
import * as store from '../core/store.js';
import { makeCard, variantButtons, selectControl } from '../core/gallery-kit.js';
import { dayCountsOf } from '../core/selection.js';
import { buildHourGrid, buildDial } from '../core/period-demo.js';
import { buildWeekdayProfile, buildMonthProfile } from '../core/profile-demo.js';
import { formatNumber } from '../core/format.js';
import { viewDataFor, observedOf, selectedIds, fill, messageSvg, setNote, choiceOf, setChoice, usesNode, setUses } from '../core/explore-kit.js';
import { cardHelp } from '../core/explain-kit.js';
import { liveSentence } from '../core/explore-live.js';

const T = viewSettings.time;
const ui = explore.ui;

// Help ids of the cards in this module (checked by explore-help.test.js).
export const cardIds = ['P1', 'P2', 'P3', 'P4'];

function viewById(id) {
  return views.find((v) => v.id === id);
}

// Timed view data: the entries with a clock time, and the labels. Days are not used by P1 and P2.
function timedOf(state) {
  const view = viewDataFor(state);
  return { labels: view.labels, entries: view.entries };
}

function untimedText(state) {
  return fill(ui.untimed, { count: formatNumber(viewDataFor(state).untimedCount) });
}

function labelOptions(state) {
  return selectedIds(state).map((id) => ({ value: String(id), label: state.data.labels[id].text }));
}

export default {
  id: 'explore-periodic',
  title: ui.periodTitle,
  phase: 4,
  order: 19,
  mount(container) {
    const selected = () => selectedIds(store.get());
    const cards = [];

    // P1: marks by weekday and clock hour, for all labels or one of the selection (the choice is 'all' or a label id).
    const p1 = viewById('P1');
    const p1Controls = document.createElement('div');
    p1Controls.className = 'explore-controls';
    const p1Uses = usesNode();
    const p1State = { metric: 'count' };
    const p1Help = cardHelp('P1');
    const p1Card = makeCard({
      heading: `${p1.id} ${p1.title}`,
      note: ui.descriptive,
      controls: () => [p1Help.help, p1Uses, p1Controls, p1Help.live],
      draw: (width) => {
        const s = store.get();
        p1Help.say('');
        setUses(p1Uses, '');
        if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
        const timed = timedOf(s);
        if (timed.entries.length === 0) return messageSvg(width, ui.noTimed, ui.tabTitle);
        const choice = choiceOf(s, 'P1', 'all');
        const labelId = choice === 'all' ? null : choice;
        setNote(p1Card.card, fill(ui.noteP1, { untimed: untimedText(s), descriptive: ui.descriptive }));
        setUses(p1Uses, labelId === null
          ? fill(ui.usesAll, { count: selected().length })
          : fill(ui.usesOne, { label: s.data.labels[labelId].text }));
        const grid = buildHourGrid(timed, labelId, p1State.metric, T.weekStart);
        p1Help.say(liveSentence('P1', grid));
        return p1.render(grid, { width });
      },
    });
    cards.push(p1Card);

    function fillP1Controls() {
      const s = store.get();
      p1Controls.replaceChildren(
        selectControl(ui.labelLabel, [{ value: 'all', label: ui.periodLabelAll }, ...labelOptions(s)], String(choiceOf(s, 'P1', 'all')), (value) => {
          setChoice('P1', value === 'all' ? 'all' : Number(value));
        }),
        selectControl(ui.periodMetric, [
          { value: 'count', label: ui.metricCount },
          { value: 'share', label: ui.metricShare },
        ], p1State.metric, (value) => {
          p1State.metric = value;
          p1Card.redraw();
        }),
      );
    }

    // P2: hour dial. Variant a: one label as wedges (the Label select); variant b: the selection as rings (no select).
    const p2 = viewById('P2');
    const p2State = { variant: p2.variants[0].id };
    const p2Controls = document.createElement('div');
    p2Controls.className = 'explore-controls';
    const p2Uses = usesNode();
    const p2Help = cardHelp('P2');
    let p2Select = null;
    const p2Label = (s) => choiceOf(s, 'P2', selectedIds(s)[0] ?? null);
    const p2Card = makeCard({
      heading: `${p2.id} ${p2.title}`,
      note: ui.descriptive,
      controls: () => [p2Help.help, p2Uses, p2Controls, p2Help.live],
      draw: (width) => {
        const s = store.get();
        p2Help.say('');
        setUses(p2Uses, '');
        if (p2Select) p2Select.hidden = p2State.variant === 'b';
        if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
        if (selected().length === 0) return messageSvg(width, ui.noSelection, ui.tabTitle);
        const timed = timedOf(s);
        if (timed.entries.length === 0) return messageSvg(width, ui.noTimed, ui.tabTitle);
        const ids = p2State.variant === 'b' ? selected() : [p2Label(s)];
        setNote(p2Card.card, fill(ui.noteP2, { untimed: untimedText(s), descriptive: ui.descriptive }));
        setUses(p2Uses, p2State.variant === 'b'
          ? fill(ui.usesAll, { count: selected().length })
          : fill(ui.usesOne, { label: s.data.labels[ids[0]].text }));
        const dial = buildDial(timed, ids, explore.periodic.dialBins);
        p2Help.say(liveSentence('P2', dial));
        return p2.render(dial, { variant: p2State.variant, width });
      },
    });
    cards.push(p2Card);

    function fillP2Controls(redraw) {
      const s = store.get();
      p2Select = selectControl(ui.labelLabel, labelOptions(s), String(p2Label(s)), (value) => {
        setChoice('P2', Number(value));
      });
      p2Select.hidden = p2State.variant === 'b';
      p2Controls.replaceChildren(
        variantButtons(p2.variants, p2State, redraw),
        p2Select,
      );
    }

    // P3 and P4: one label, observed days. The numbers under the bars are days with the label over observed days.
    function profileCard(view, note, build) {
      const controls = document.createElement('div');
      controls.className = 'explore-controls';
      const uses = usesNode();
      const help = cardHelp(view.id);
      const label = (s) => choiceOf(s, view.id, selectedIds(s)[0] ?? null);
      const made = makeCard({
        heading: `${view.id} ${view.title}`,
        note: ui.descriptive,
        controls: () => [help.help, uses, controls, help.live],
        draw: (width) => {
          const s = store.get();
          help.say('');
          setUses(uses, '');
          if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
          if (selected().length === 0) return messageSvg(width, ui.noSelection, ui.tabTitle);
          const labelId = label(s);
          const days = dayCountsOf(s.data)[labelId];
          setNote(made.card, fill(note, { days: formatNumber(days), descriptive: ui.descriptive }));
          setUses(uses, fill(ui.usesOne, { label: s.data.labels[labelId].text }));
          const data = build(observedOf(s), labelId);
          help.say(liveSentence(view.id, data));
          return view.render(data, { width });
        },
      });
      const refreshControls = () => {
        const s = store.get();
        controls.replaceChildren(selectControl(ui.labelLabel, labelOptions(s), String(label(s)), (value) => {
          setChoice(view.id, Number(value));
        }));
      };
      return { ...made, refreshControls };
    }

    const p3Card = profileCard(viewById('P3'), ui.noteP3, (synth, id) => buildWeekdayProfile(synth, id, T.weekStart));
    const p4Card = profileCard(viewById('P4'), ui.noteP4, (synth, id) => buildMonthProfile(synth, id));
    cards.push(p3Card, p4Card);

    for (const c of cards) container.append(c.card);

    function refresh() {
      fillP1Controls();
      fillP2Controls(p2Card.redraw);
      p3Card.refreshControls();
      p4Card.refreshControls();
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
