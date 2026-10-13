// Gallery of the E views on synthetic data (demo only; nothing here is a statistic).
// phase is an integer because registry.js requires one (SPEC 5 contract); this module is phase 1.
import { windows } from '../config/windows.js';
import { viewSettings } from '../config/views.js';
import { synth as synthConfig } from '../config/synth.js';
import { views } from '../views/index.js';
import { generate } from '../core/synth.js';
import { computeEchoes, buildE1Data, buildE2Data, buildE3Data } from '../core/echo-demo.js';
import { banner, makeCard, variantButtons, checkToggle } from '../core/gallery-kit.js';

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

// Deliberate error for checking diagnostics: the message names a synthetic label, which must appear as a token.
// The status line is an aria-live region; it reports the count after the error has been captured.
function errorCard(diag, sampleText) {
  const card = document.createElement('section');
  card.className = 'card';
  const heading = document.createElement('h2');
  heading.textContent = 'Diagnostics check';
  const note = document.createElement('p');
  note.className = 'card-sub';
  note.textContent = 'Throws an error later, outside the click handler. The diagnostics file should show a token, not the label text.';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Trigger test error';
  const status = document.createElement('p');
  status.className = 'card-sub';
  status.setAttribute('aria-live', 'polite');
  btn.addEventListener('click', () => {
    setTimeout(() => {
      throw new Error(`Deliberate test error near ${sampleText}`);
    }, 0);
    setTimeout(() => {
      status.textContent = `Test error recorded (${diag.totalErrors()})`;
    }, 0);
  });
  card.append(heading, note, btn, status);
  return card;
}

export default {
  id: 'gallery',
  title: 'Gallery',
  phase: 1,
  order: 5,
  mount(container, ctx) {
    const data = generate(synthConfig);
    for (const label of data.labels) ctx.diag.register(label.text, 'label');
    const viewData = buildViewData(data);

    container.append(banner('Synthetic data. Not your export. Badges marked DEMO are forced for display, not computed.'));
    const cards = views.filter((v) => v.id.startsWith('E')).map((view) => echoCard(view, viewData[view.id]));
    for (const { card } of cards) container.append(card);
    for (const { redraw } of cards) redraw();
    container.append(errorCard(ctx.diag, data.labels[0].text));
  },
};
