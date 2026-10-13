// Gallery of the time views T1 to T4 on synthetic data (demo only; nothing here is a statistic).
// phase is an integer because registry.js requires one (SPEC 5 contract); this module is phase 1.
import { viewSettings } from '../config/views.js';
import { synth as synthConfig } from '../config/synth.js';
import { views } from '../views/index.js';
import { generate } from '../core/synth.js';
import { buildTimeData, buildYearData, buildRollingData, labelIdOf } from '../core/time-demo.js';
import { banner, makeCard, variantButtons, selectControl } from '../core/gallery-kit.js';

const T = viewSettings.time;

function yearCard(view, data, base) {
  const state = { variant: view.variants[0].id, metric: 'mood', labelId: labelIdOf(data, T.defaultYearLabel) };
  let yearData = base;
  const labelOptions = data.labels.map((l) => ({ value: l.id, label: l.text }));
  return makeCard({
    heading: `${view.id} ${view.title}`,
    note: `Calendar year ${yearData.year}, synthetic. Colour is mood (bad to great) or presence of the chosen label.`,
    controls: (redraw) => [
      variantButtons(view.variants, state, redraw),
      selectControl('Colour by', [
        { value: 'mood', label: 'Mood' },
        { value: 'label', label: 'Label present' },
      ], state.metric, (value) => {
        state.metric = value;
        redraw();
      }),
      selectControl('Label', labelOptions, state.labelId, (value) => {
        state.labelId = Number(value);
        yearData = buildYearData(data, yearData.year, state.labelId);
        redraw();
      }),
    ],
    draw: (width) => view.render(yearData, { ...state, width }),
  });
}

function lanesCard(view, data) {
  const state = { range: T.lanes.defaultRange };
  return makeCard({
    heading: `${view.id} ${view.title}`,
    note: 'Ticks are days with the label; the band is mood per day (or per bucket when a range is long).',
    controls: (redraw) => [
      selectControl('Range', T.lanes.ranges.map((r) => ({ value: r.id, label: r.label })), state.range, (value) => {
        state.range = value;
        redraw();
      }),
    ],
    draw: (width) => view.render(data, { ...state, width }),
  });
}

function stripCard(view, data) {
  return makeCard({
    heading: `${view.id} ${view.title}`,
    note: 'Last 12 calendar months. Bar height = share of days with the label; triangle = change against the previous month.',
    controls: () => [],
    draw: (width) => view.render(data, { width }),
  });
}

function rollingCard(view, data, labelIds, initial) {
  const state = { window: T.rolling.defaultWindow };
  let rolling = initial;
  return makeCard({
    heading: `${view.id} ${view.title}`,
    note: 'Share of days with each label in a trailing window. Shorter windows react faster and are noisier.',
    controls: (redraw) => [
      selectControl('Window', T.rolling.windows.map((w) => ({ value: w, label: `${w} days` })), state.window, (value) => {
        state.window = Number(value);
        rolling = buildRollingData(data, labelIds, state.window);
        redraw();
      }),
    ],
    draw: (width) => view.render(rolling, { ...state, width }),
  });
}

export default {
  id: 'gallery-time',
  title: 'Gallery: time',
  phase: 1,
  order: 6,
  mount(container, ctx) {
    const data = generate(synthConfig);
    for (const label of data.labels) ctx.diag.register(label.text, 'label');
    const base = buildTimeData(data);
    const byId = (id) => views.find((v) => v.id === id);
    const rollingIds = T.rolling.labels.map((text) => labelIdOf(data, text));

    container.append(banner('Synthetic data. Not your export. Badges and bands are demo renderings, not statistics.'));
    const cards = [
      yearCard(byId('T1'), data, base.T1),
      lanesCard(byId('T2'), base.T2),
      stripCard(byId('T3'), base.T3),
      rollingCard(byId('T4'), data, rollingIds, base.T4),
    ];
    for (const { card } of cards) container.append(card);
    for (const { redraw } of cards) redraw();
  },
};
