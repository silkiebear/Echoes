// Gallery of the periodic views P1 and P2 on synthetic data (demo only; nothing here is a statistic).
// phase is an integer because registry.js requires one (SPEC 5 contract); this module is phase 1.
import { viewSettings } from '../config/views.js';
import { synth as synthConfig } from '../config/synth.js';
import { views } from '../views/index.js';
import { generate } from '../core/synth.js';
import { buildHourGrid, buildDial } from '../core/period-demo.js';
import { buildWeekdayProfile, buildMonthProfile } from '../core/profile-demo.js';
import { banner, makeCard, variantButtons, selectControl, checkToggle } from '../core/gallery-kit.js';
import { notes } from '../config/notes.js';

const G = viewSettings.gallery;
const T = viewSettings.time;
const DIAL_HOURS = 24;

function p1Card(view, shared, labelOptions) {
  const state = { labelId: null, metric: 'count' };
  return makeCard({
    heading: `${view.id} ${view.title}`,
    note: 'Marks by weekday and clock time (synthetic). Darker cells hold more marks. A pill appears when most entries share one time.',
    controls: (redraw) => [
      selectControl('Label', [
        { value: 'all', label: 'All labels' },
        ...labelOptions,
      ], 'all', (value) => {
        state.labelId = value === 'all' ? null : Number(value);
        redraw();
      }),
      selectControl('Metric', [
        { value: 'count', label: 'Count' },
        { value: 'share', label: 'Share of marks' },
      ], state.metric, (value) => {
        state.metric = value;
        redraw();
      }),
    ],
    draw: (width) => view.render(buildHourGrid(shared.synth, state.labelId, state.metric, T.weekStart), { width }),
  });
}

function p2Card(view, shared, labelOptions, dialIds, defaultLabelId) {
  const state = { variant: view.variants[0].id, labelId: defaultLabelId };
  return makeCard({
    heading: `${view.id} ${view.title}`,
    note: `Marks by hour of day (synthetic). Wedges: length = marks in the hour. Rings: one ring per label, shade = share of that label marks in the hour. ${notes.p2Rings}`,
    controls: (redraw) => [
      variantButtons(view.variants, state, redraw),
      selectControl('Label', labelOptions, state.labelId, (value) => {
        state.labelId = Number(value);
        redraw();
      }),
    ],
    draw: (width) => view.render(
      state.variant === 'b' ? buildDial(shared.synth, dialIds, DIAL_HOURS) : buildDial(shared.synth, [state.labelId], DIAL_HOURS),
      { variant: state.variant, width },
    ),
  });
}

function profileCard(view, shared, labelOptions, defaultLabelId, rowsFor, note) {
  const state = { labelId: defaultLabelId };
  return makeCard({
    heading: `${view.id} ${view.title}`,
    note,
    controls: (redraw) => [
      selectControl('Label', labelOptions, state.labelId, (value) => {
        state.labelId = Number(value);
        redraw();
      }),
    ],
    draw: (width) => view.render(rowsFor(shared.synth, state.labelId), { width }),
  });
}

export default {
  id: 'gallery-periodic',
  title: 'Gallery: periodic',
  phase: 1,
  order: 7,
  mount(container, ctx) {
    const shared = { single: false, synth: null };
    const regenerate = (single) => {
      shared.synth = generate({ ...synthConfig, timeOfDay: { ...synthConfig.timeOfDay, mode: single ? 'single' : 'varied' } });
      shared.single = single;
    };
    regenerate(false);
    for (const label of shared.synth.labels) ctx.diag.register(label.text, 'label');
    const labelOptions = shared.synth.labels.map((l) => ({ value: l.id, label: l.text }));
    const dialIds = G.dialLabels.map((text) => shared.synth.labels.find((l) => l.text === text).id);
    const defaultLabelId = shared.synth.labels.find((l) => l.text === G.periodicLabel).id;
    const byId = (id) => views.find((v) => v.id === id);

    container.append(banner('Synthetic data. Not your export. Periodic views show when marks were logged; they are demo renderings, not statistics.'));
    const toggle = checkToggle('Time data: single timestamp (every entry at 12:00)', (checked) => {
      regenerate(checked);
      for (const c of cards) c.redraw();
    });
    container.append(toggle);
    const idOfText = (text) => shared.synth.labels.find((l) => l.text === text).id;
    const cards = [
      p1Card(byId('P1'), shared, labelOptions),
      p2Card(byId('P2'), shared, labelOptions, dialIds, defaultLabelId),
      profileCard(byId('P3'), shared, labelOptions, idOfText('Friends meetup P+'), (s, id) => buildWeekdayProfile(s, id, T.weekStart),
        'Share of days with the label, by weekday (assigned days). Dashed line: overall share. Numbers under bars: days observed.'),
      profileCard(byId('P4'), shared, labelOptions, idOfText('Hot bath B+'), (s, id) => buildMonthProfile(s, id),
        'Share of days with the label, by month, years pooled. Dashed line: overall share. Numbers under bars: days observed.'),
    ];
    for (const { card } of cards) container.append(card);
    for (const { redraw } of cards) redraw();
  },
};
