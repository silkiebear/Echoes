// Explore: the T views on your data (phase 4c, 4c.2). T1 one label by year, T2 lanes for the selection over a mood
// band, T3 month strip and T4 rolling rates (observed days). Descriptive only: no significance test, no multiple-testing
// control. Data comes from core\view-data.js through core\explore-kit.js; the views are the existing ones.
import { views } from '../views/index.js';
import { viewSettings } from '../config/views.js';
import { explore } from '../config/explore.js';
import * as store from '../core/store.js';
import { makeCard, variantButtons, selectControl } from '../core/gallery-kit.js';
import { dayCountsOf } from '../core/selection.js';
import { buildYearData, buildLanesData, buildStripData, buildRollingData } from '../core/time-demo.js';
import { formatNumber } from '../core/format.js';
import { viewDataFor, observedOf, selectedIds, fill, messageSvg, setNote } from '../core/explore-kit.js';

const T = viewSettings.time;
const ui = explore.ui;

function yearsOf(synth) {
  return [...new Set(synth.days.map((d) => Number(d.date.slice(0, 4))))].sort((a, b) => a - b);
}

function listOf(state, ids) {
  const counts = dayCountsOf(state.data);
  return ids.map((id) => `${state.data.labels[id].text}: ${formatNumber(counts[id])}`).join(ui.listSep);
}

function viewById(id) {
  return views.find((v) => v.id === id);
}

export default {
  id: 'explore-time',
  title: ui.tabTitle,
  phase: 4,
  order: 18,
  mount(container) {
    const selected = () => selectedIds(store.get());
    const cards = [];

    // T1: one label by calendar year. The label is one of the selection; the year list comes from the data.
    const t1 = viewById('T1');
    const t1State = { variant: t1.variants[0].id, metric: 'mood', labelId: null, year: null };
    const t1Controls = document.createElement('div');
    t1Controls.className = 'explore-controls';
    const t1Card = makeCard({
      heading: `${t1.id} ${t1.title}`,
      note: ui.descriptive,
      controls: () => [t1Controls],
      draw: (width) => drawT1(width),
    });
    cards.push(t1Card);

    function fillT1Controls(redraw) {
      const s = store.get();
      const years = s.data ? yearsOf(viewDataFor(s)) : [];
      if (t1State.year === null || !years.includes(t1State.year)) t1State.year = years[years.length - 1] ?? null;
      if (!selected().includes(t1State.labelId)) t1State.labelId = selected()[0] ?? null;
      t1Controls.replaceChildren(
        variantButtons(t1.variants, t1State, redraw),
        selectControl(ui.colourLabel, [
          { value: 'mood', label: 'Mood' },
          { value: 'label', label: 'Label present' },
        ], t1State.metric, (value) => {
          t1State.metric = value;
          redraw();
        }),
        selectControl(ui.yearLabel, years.map((y) => ({ value: String(y), label: String(y) })), String(t1State.year), (value) => {
          t1State.year = Number(value);
          redraw();
        }),
        selectControl(ui.labelLabel, selected().map((id) => ({ value: String(id), label: s.data.labels[id].text })), String(t1State.labelId), (value) => {
          t1State.labelId = Number(value);
          redraw();
        }),
      );
    }

    function drawT1(width) {
      const s = store.get();
      if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
      if (selected().length === 0) return messageSvg(width, ui.noSelection, ui.tabTitle);
      if (t1State.year === null) return messageSvg(width, ui.noYear, ui.tabTitle);
      const data = buildYearData(viewDataFor(s), t1State.year, t1State.labelId);
      const present = data.days.filter((d) => d.present === 1).length;
      setNote(t1Card.card, fill(ui.noteT1, { days: formatNumber(present), descriptive: ui.descriptive }));
      return t1.render(data, { ...t1State, width });
    }

    // T2: lanes for the selection over a mood band; the range is the existing choice list.
    const t2 = viewById('T2');
    const t2State = { range: T.lanes.defaultRange };
    const t2Card = makeCard({
      heading: `${t2.id} ${t2.title}`,
      note: ui.descriptive,
      controls: (redraw) => [selectControl(ui.rangeLabel, T.lanes.ranges.map((r) => ({ value: r.id, label: r.label })), t2State.range, (value) => {
        t2State.range = value;
        redraw();
      })],
      draw: (width) => {
        const s = store.get();
        if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
        if (selected().length === 0) return messageSvg(width, ui.noSelection, ui.tabTitle);
        setNote(t2Card.card, fill(ui.noteT2, { list: listOf(s, selected()), descriptive: ui.descriptive }));
        return t2.render(buildLanesData(viewDataFor(s), selected()), { range: t2State.range, width });
      },
    });
    cards.push(t2Card);

    // T3: share of observed days per calendar month, for the selection (the last 12 months).
    const t3 = viewById('T3');
    const t3Card = makeCard({
      heading: `${t3.id} ${t3.title}`,
      note: ui.descriptive,
      controls: () => [],
      draw: (width) => {
        const s = store.get();
        if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
        if (selected().length === 0) return messageSvg(width, ui.noSelection, ui.tabTitle);
        setNote(t3Card.card, fill(ui.noteT3, { list: listOf(s, selected()), descriptive: ui.descriptive }));
        return t3.render(buildStripData(observedOf(s), selected(), T.strip.bins), { width });
      },
    });
    cards.push(t3Card);

    // T4: share of observed days with each label in a trailing window (the existing windows).
    const t4 = viewById('T4');
    const t4State = { window: T.rolling.defaultWindow };
    const t4Card = makeCard({
      heading: `${t4.id} ${t4.title}`,
      note: ui.descriptive,
      controls: (redraw) => [selectControl(ui.windowLabel, T.rolling.windows.map((w) => ({ value: String(w), label: `${w} days` })), String(t4State.window), (value) => {
        t4State.window = Number(value);
        redraw();
      })],
      draw: (width) => {
        const s = store.get();
        if (!s.data) return messageSvg(width, ui.noData, ui.tabTitle);
        if (selected().length === 0) return messageSvg(width, ui.noSelection, ui.tabTitle);
        setNote(t4Card.card, fill(ui.noteT4, { list: listOf(s, selected()), descriptive: ui.descriptive }));
        return t4.render(buildRollingData(observedOf(s), selected(), t4State.window), { window: t4State.window, width });
      },
    });
    cards.push(t4Card);

    for (const { card } of cards) container.append(card);

    function refresh() {
      fillT1Controls(t1Card.redraw);
      for (const c of cards) c.redraw();
    }

    const unsubscribe = store.subscribe(() => {
      if (!container.isConnected) {
        unsubscribe();
        return;
      }
      refresh();
    });
    fillT1Controls(t1Card.redraw);
    for (const c of cards) c.redraw();
  },
};
