// Explore: the periodic views P1 to P4 on your data (phase 4c, 4c.3). P1 weekday by clock hour (one label or all),
// P2 hour dial (one label as wedges, or the selection as rings), P3 weekday profile and P4 month profile (one label
// each, observed days). Descriptive only. The low time-of-day diversity pill comes from the existing flag code, on the
// timed entries of the view.
import { views } from '../views/index.js';
import { viewSettings } from '../config/views.js';
import { explore } from '../config/explore.js';
import * as store from '../core/store.js';
import { makeCard, variantButtons, selectControl } from '../core/gallery-kit.js';
import { dayCountsOf } from '../core/selection.js';
import { buildHourGrid, buildDial } from '../core/period-demo.js';
import { buildWeekdayProfile, buildMonthProfile } from '../core/profile-demo.js';
import { formatNumber } from '../core/format.js';
import { viewDataFor, observedOf, selectedIds, fill, messageSvg, setNote } from '../core/explore-kit.js';

const T = viewSettings.time;
const ui = explore.ui;

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

    // P1: marks by weekday and clock hour, for all labels or one of the selection.
    const p1 = viewById('P1');
    const p1State = { labelId: 'all', metric: 'count' };
    const p1Controls = document.createElement('div');
    p1Controls.className = 'explore-controls';
    const p1Card = makeCard({
      heading: `${p1.id} ${p1.title}`,
      note: ui.descriptive,
      controls: () => [p1Controls],
      draw: (width) => {
        const s = store.get();
        if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
        const timed = timedOf(s);
        if (timed.entries.length === 0) return messageSvg(width, ui.noTimed, ui.tabTitle);
        const labelId = p1State.labelId === 'all' ? null : Number(p1State.labelId);
        setNote(p1Card.card, fill(ui.noteP1, { untimed: untimedText(s), descriptive: ui.descriptive }));
        return p1.render(buildHourGrid(timed, labelId, p1State.metric, T.weekStart), { width });
      },
    });
    cards.push(p1Card);

    function fillP1Controls(redraw) {
      const s = store.get();
      if (p1State.labelId !== 'all' && !selected().includes(Number(p1State.labelId))) p1State.labelId = 'all';
      p1Controls.replaceChildren(
        selectControl(ui.labelLabel, [{ value: 'all', label: ui.periodLabelAll }, ...labelOptions(s)], p1State.labelId, (value) => {
          p1State.labelId = value;
          redraw();
        }),
        selectControl(ui.periodMetric, [
          { value: 'count', label: ui.metricCount },
          { value: 'share', label: ui.metricShare },
        ], p1State.metric, (value) => {
          p1State.metric = value;
          redraw();
        }),
      );
    }

    // P2: hour dial. Variant a: one label as wedges; variant b: the selection as rings.
    const p2 = viewById('P2');
    const p2State = { variant: p2.variants[0].id, labelId: null };
    const p2Controls = document.createElement('div');
    p2Controls.className = 'explore-controls';
    const p2Card = makeCard({
      heading: `${p2.id} ${p2.title}`,
      note: ui.descriptive,
      controls: () => [p2Controls],
      draw: (width) => {
        const s = store.get();
        if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
        if (selected().length === 0) return messageSvg(width, ui.noSelection, ui.tabTitle);
        const timed = timedOf(s);
        if (timed.entries.length === 0) return messageSvg(width, ui.noTimed, ui.tabTitle);
        const ids = p2State.variant === 'b' ? selected() : [p2State.labelId];
        setNote(p2Card.card, fill(ui.noteP2, { untimed: untimedText(s), descriptive: ui.descriptive }));
        return p2.render(buildDial(timed, ids, explore.periodic.dialBins), { variant: p2State.variant, width });
      },
    });
    cards.push(p2Card);

    function fillP2Controls(redraw) {
      if (!selected().includes(p2State.labelId)) p2State.labelId = selected()[0] ?? null;
      p2Controls.replaceChildren(
        variantButtons(p2.variants, p2State, redraw),
        selectControl(ui.labelLabel, labelOptions(store.get()), String(p2State.labelId), (value) => {
          p2State.labelId = Number(value);
          redraw();
        }),
      );
    }

    // P3 and P4: one label, observed days. The numbers under the bars are days with the label over observed days.
    function profileCard(view, note, build) {
      const state = { labelId: null };
      const controls = document.createElement('div');
      controls.className = 'explore-controls';
      const made = makeCard({
        heading: `${view.id} ${view.title}`,
        note: ui.descriptive,
        controls: () => [controls],
        draw: (width) => {
          const s = store.get();
          if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
          if (selected().length === 0) return messageSvg(width, ui.noSelection, ui.tabTitle);
          if (!selected().includes(state.labelId)) state.labelId = selected()[0];
          const days = dayCountsOf(s.data)[state.labelId];
          setNote(made.card, fill(note, { days: formatNumber(days), descriptive: ui.descriptive }));
          return view.render(build(observedOf(s), state.labelId), { width });
        },
      });
      const refreshControls = (redraw) => {
        const s = store.get();
        if (!selected().includes(state.labelId)) state.labelId = selected()[0] ?? null;
        controls.replaceChildren(selectControl(ui.labelLabel, labelOptions(s), String(state.labelId), (value) => {
          state.labelId = Number(value);
          redraw();
        }));
      };
      return { ...made, refreshControls };
    }

    const p3Card = profileCard(viewById('P3'), ui.noteP3, (synth, id) => buildWeekdayProfile(synth, id, T.weekStart));
    const p4Card = profileCard(viewById('P4'), ui.noteP4, (synth, id) => buildMonthProfile(synth, id));
    cards.push(p3Card, p4Card);

    for (const c of cards) container.append(c.card);

    function refresh() {
      fillP1Controls(p1Card.redraw);
      fillP2Controls(p2Card.redraw);
      p3Card.refreshControls(p3Card.redraw);
      p4Card.refreshControls(p4Card.redraw);
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
