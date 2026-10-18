// Gallery of the E views on synthetic data (demo only; nothing here is a statistic).
// phase is an integer because registry.js requires one (SPEC 5 contract); this module is phase 1.
import { windows } from '../config/windows.js';
import { viewSettings } from '../config/views.js';
import { synth as synthConfig } from '../config/synth.js';
import { views } from '../views/index.js';
import { generate } from '../core/synth.js';
import { computeEchoes, buildE1Data, buildE2Data, buildE3Data } from '../core/echo-demo.js';
import { banner, makeCard, variantButtons, checkToggle, selectControl } from '../core/gallery-kit.js';
import { buildE4Data } from '../core/event-study-demo.js';

const g = viewSettings.gallery;

const NOTES = {
  E1: `Exposure ${g.e1Exposure}. Rate ratio = outcome rate after exposure / overall outcome rate.`,
  E2: `Exposure ${g.e2Exposure}, outcome ${g.e2Outcome}, by lag in days.`,
  E3: 'Top results by rate ratio across all synthetic exposure and outcome pairs.',
};

function labelId(data, text) {
  const label = data.labels.find((l) => l.text === text);
  if (!label) throw new Error('gallery: a configured synthetic label is missing');
  return label.id;
}

function buildViewData(data) {
  const echoes = computeEchoes(data, windows, viewSettings.echo);
  const exposureId = labelId(data, g.e1Exposure);
  const outcomeIds = data.labels
    .map((l) => l.id)
    .filter((id) => id !== exposureId)
    .slice(0, viewSettings.matrix.maxOutcomes);
  const e2Exposure = labelId(data, g.e2Exposure);
  const e2Outcome = labelId(data, g.e2Outcome);
  return {
    E1: buildE1Data(data, echoes, exposureId, outcomeIds, windows),
    E2: buildE2Data(data, e2Exposure, e2Outcome, viewSettings.curve),
    E3: buildE3Data(data, echoes, windows, viewSettings.ranking.maxRows),
  };
}

function echoCard(view, viewData) {
  const state = { variant: view.variants[0].id, hideFlagged: false };
  const { card, redraw } = makeCard({
    heading: `${view.id} ${view.title}`,
    note: NOTES[view.id] || '',
    controls: (redraw) => {
      const nodes = [];
      if (view.variants.length > 1) nodes.push(variantButtons(view.variants, state, redraw));
      if (view.id === 'E3') {
        nodes.push(checkToggle('Hide flagged results', (on) => {
          state.hideFlagged = on;
          redraw();
        }));
      }
      return nodes;
    },
    draw: (width) => view.render(viewData, { ...state, width }),
  });
  return { card, redraw };
}

// E4 has its own controls (exposure and window), so its data is rebuilt on each change.
function e4Card(view, data) {
  const es = viewSettings.eventStudy;
  const state = { exposureId: labelId(data, 'Alcohol H-'), windowDays: es.defaultWindow };
  let e4 = buildE4Data(data, state.exposureId, state.windowDays);
  return makeCard({
    heading: `${view.id} ${view.title}`,
    note: `Event = a day with the exposure and none in the previous ${es.gapDays} days. Bars: change in the share of days with each label, after minus before. Demo flags only.`,
    controls: (redraw) => [
      selectControl('Exposure', data.labels.map((l) => ({ value: l.id, label: l.text })), state.exposureId, (value) => {
        state.exposureId = Number(value);
        e4 = buildE4Data(data, state.exposureId, state.windowDays);
        redraw();
      }),
      selectControl('Window', es.windows.map((w) => ({ value: w, label: `${w} days` })), state.windowDays, (value) => {
        state.windowDays = Number(value);
        e4 = buildE4Data(data, state.exposureId, state.windowDays);
        redraw();
      }),
    ],
    draw: (width) => view.render(e4, { width }),
  });
}

// The synthetic labels are not registered here: they reach no log at mount (phase 4c, 4c.0.2). The Tools card
// (diag-check.js) registers its own demo label when its button is pressed.
export default {
  id: 'gallery',
  title: 'Gallery',
  phase: 1,
  order: 5,
  mount(container) {
    const data = generate(synthConfig);
    const viewData = buildViewData(data);

    container.append(banner('Synthetic data. Not your export. Badges marked DEMO are forced for display, not computed.'));
    const cards = [
      ...views.filter((v) => v.id.startsWith('E') && v.id !== 'E4').map((view) => echoCard(view, viewData[view.id])),
      e4Card(views.find((v) => v.id === 'E4'), data),
    ];
    for (const { card } of cards) container.append(card);
    for (const { redraw } of cards) redraw();
  },
};
