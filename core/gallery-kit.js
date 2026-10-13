// Shared gallery helpers: banner, card with zoom, variant buttons, toggles and selects.
// Used by modules/gallery.js (E views) and modules/gallery-time.js (T views).
import { viewSettings } from '../config/views.js';
import { mountSvg, sizeSvg } from './svg.js';
import { attachZoom } from './zoom.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function banner(text) {
  return el('p', 'banner', text);
}

// Card with a chart area that scrolls and zooms. `controls(redraw)` returns the control nodes, `draw(width)`
// returns the svg string for the available width. Call redraw() after the card is in the page (width needs layout).
export function makeCard({ heading, note, controls, draw }) {
  const card = el('section', 'card');
  const chart = el('div', 'chart');
  const scroll = el('div', 'chart-scroll');
  scroll.append(chart);

  function redraw() {
    const width = scroll.clientWidth || viewSettings.defaultWidth;
    mountSvg(chart, draw(width));
    sizeSvg(chart.querySelector('svg'), viewSettings.minWidth);
    zoom.refresh();
  }

  card.append(el('h2', null, heading), el('p', 'card-sub', note), ...controls(redraw), scroll);
  const zoom = attachZoom(scroll, viewSettings.zoom);
  return { card, redraw };
}

export function variantButtons(variants, state, redraw) {
  const bar = el('div', 'row');
  const buttons = variants.map((variant) => {
    const btn = el('button', null, variant.label);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      state.variant = variant.id;
      sync();
      redraw();
    });
    bar.append(btn);
    return btn;
  });
  function sync() {
    buttons.forEach((btn, i) => btn.setAttribute('aria-pressed', String(variants[i].id === state.variant)));
  }
  sync();
  return bar;
}

export function checkToggle(text, onChange) {
  const label = el('label', 'check');
  const box = el('input');
  box.type = 'checkbox';
  box.addEventListener('change', () => onChange(box.checked));
  label.append(box, el('span', null, text));
  return label;
}

// options: [{ value, label }]. onChange receives the selected value as a string.
export function selectControl(text, options, value, onChange) {
  const label = el('label', 'select');
  const select = el('select');
  for (const opt of options) {
    const node = el('option', null, opt.label);
    node.value = String(opt.value);
    select.append(node);
  }
  select.value = String(value);
  select.addEventListener('change', () => onChange(select.value));
  label.append(el('span', null, text), select);
  return label;
}
