// Gallery of the phase 1a views on synthetic data (demo only; nothing here is a statistic).
// phase is an integer because registry.js requires one (SPEC 5 contract); this module is phase 1a.
import { windows } from '../config/windows.js';
import { viewSettings } from '../config/views.js';
import { synth as synthConfig } from '../config/synth.js';
import { views } from '../views/index.js';
import { generate } from '../core/synth.js';
import { computeEchoes, buildE1Data, buildE2Data, buildE3Data } from '../core/echo-demo.js';
import { mountSvg, sizeSvg } from '../core/svg.js';
import { attachZoom } from '../core/zoom.js';

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

function variantButtons(view, state, redraw) {
  const bar = document.createElement('div');
  bar.className = 'row';
  const buttons = view.variants.map((variant) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = variant.label;
    btn.addEventListener('click', () => {
      state.variant = variant.id;
      sync();
      redraw();
    });
    bar.append(btn);
    return btn;
  });
  function sync() {
    buttons.forEach((btn, i) => btn.setAttribute('aria-pressed', String(view.variants[i].id === state.variant)));
  }
  sync();
  return bar;
}

function hideToggle(state, redraw) {
  const label = document.createElement('label');
  label.className = 'check';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.addEventListener('change', () => {
    state.hideFlagged = box.checked;
    redraw();
  });
  const text = document.createElement('span');
  text.textContent = 'Hide flagged results';
  label.append(box, text);
  return label;
}

function makeCard(view, viewData) {
  const card = document.createElement('section');
  card.className = 'card';
  const heading = document.createElement('h2');
  heading.textContent = `${view.id} ${view.title}`;
  const sub = document.createElement('p');
  sub.className = 'card-sub';
  sub.textContent = NOTES[view.id] || '';
  const state = { variant: view.variants[0].id, hideFlagged: false };
  const chart = document.createElement('div');
  chart.className = 'chart';
  const scroll = document.createElement('div');
  scroll.className = 'chart-scroll';
  scroll.append(chart);

  function redraw() {
    mountSvg(chart, view.render(viewData, state));
    sizeSvg(chart.querySelector('svg'), viewSettings.minWidth);
    zoom.refresh();
  }

  card.append(heading, sub);
  if (view.variants.length > 1) card.append(variantButtons(view, state, redraw));
  if (view.id === 'E3') card.append(hideToggle(state, redraw));
  card.append(scroll);
  const zoom = attachZoom(card, viewSettings.zoom);
  redraw();
  return card;
}

// Deliberate error for checking diagnostics: the message names a synthetic label, which must appear as a token.
function errorCard(sampleText) {
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
  btn.addEventListener('click', () => {
    setTimeout(() => {
      throw new Error(`Deliberate test error near ${sampleText}`);
    }, 0);
  });
  card.append(heading, note, btn);
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

    const banner = document.createElement('p');
    banner.className = 'banner';
    banner.textContent = 'Synthetic data. Not your export. Badges marked DEMO are forced for display, not computed.';
    container.append(banner);
    for (const view of views) container.append(makeCard(view, viewData[view.id]));
    container.append(errorCard(data.labels[0].text));
  },
};
