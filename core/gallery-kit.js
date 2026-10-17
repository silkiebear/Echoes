// Shared gallery helpers: banner, card with zoom, variant buttons, toggles and selects.
// Used by modules/gallery.js (E views) and modules/gallery-time.js (T views).
import { viewSettings } from '../config/views.js';
import { mountSvg, sizeSvg } from './svg.js';
import { attachZoom } from './zoom.js';
import { restoreAnchor } from './scroll-anchor.js';

const liveCards = new Set();
let resizeTimer = null;
let cardSeq = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Rotation and resize change the measured width, so the charts are redrawn once the events settle.
function redrawChangedCards() {
  for (const entry of liveCards) {
    if (entry.changed()) entry.redraw();
  }
  restoreAnchor(document);
}

function scheduleRedraw() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(redrawChangedCards, viewSettings.ui.resizeDebounceMs);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', scheduleRedraw);
  window.addEventListener('orientationchange', scheduleRedraw);
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

  const entry = {
    lastWidth: 0,
    changed: () => Math.abs(scroll.clientWidth - entry.lastWidth) > viewSettings.ui.resizeMinChangePx,
    redraw,
  };

  // Holds the previous height while the new chart is mounted, then releases it. The mount is synchronous, so this
  // only matters if a later step reads layout in between (UNVERIFIED on a phone).
  function redraw() {
    const measured = scroll.clientWidth;
    entry.lastWidth = measured;
    chart.style.minHeight = `${chart.offsetHeight}px`;
    mountSvg(chart, draw(measured || viewSettings.defaultWidth));
    sizeSvg(chart.querySelector('svg'), viewSettings.minWidth);
    chart.style.minHeight = '';
    zoom.refresh();
  }

  // Scroll anchor target (scroll-anchor.js). A card holds no other anchor, so it is the innermost one.
  cardSeq += 1;
  card.dataset.anchor = `chart-${cardSeq}`;
  card.append(el('h2', null, heading), el('p', 'card-sub', note), ...controls(redraw), scroll);
  const zoom = attachZoom(scroll, viewSettings.zoom);
  liveCards.add(entry);
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
