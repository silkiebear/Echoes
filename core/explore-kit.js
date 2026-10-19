// Helpers shared by the Explore cards (phase 4c, 4c.2 and 4c.3). The derived view data is cached per (data, settings)
// pair. Pure, except that messageSvg only builds a string. Text is filled into placeholders in one pass.
import { toViewData } from './view-data.js';
import { svgDoc, svgText } from './svg.js';
import { wrapText } from './textfit.js';
import { explore } from '../config/explore.js';
import { viewSettings } from '../config/views.js';

const message = explore.message;

let cache = { data: null, settings: null, view: null };

export function viewDataFor(state) {
  if (cache.data !== state.data || cache.settings !== state.settings) {
    cache = { data: state.data, settings: state.settings, view: toViewData(state.data, state.settings, explore) };
  }
  return cache.view;
}

// The calendar days as the shares see them: observed days only (SPEC 10), with the same labels.
export function observedOf(state) {
  const view = viewDataFor(state);
  return { labels: view.labels, days: view.observedDays };
}

// The selection, without ids that the current data does not have (a selection made on an older load).
export function selectedIds(state) {
  if (!state.data) return [];
  return (state.selection || []).filter((id) => state.data.labels[id] !== undefined);
}

export function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (Object.hasOwn(values, key) ? String(values[key]) : match));
}



// A card with nothing to draw yet shows its message inside the chart area (same frame as the views). The text wraps
// to the card width and the height follows the line count (4e.0.2).
export function messageSvg(width, text, title) {
  const w = width || viewSettings.defaultWidth;
  const { fontPx, lineHeight, padding } = message;
  const lines = wrapText(text, fontPx, w - 2 * padding);
  const body = lines
    .map((line, i) => svgText(padding, padding + lineHeight / 2 + i * lineHeight, line, 't-muted', 'start', fontPx))
    .join('');
  return svgDoc({
    width: w,
    height: 2 * padding + Math.max(1, lines.length) * lineHeight,
    title,
    desc: text,
    body,
  });
}

// The card's note is the second paragraph of the card (heading, note, controls, chart).
export function setNote(card, text) {
  const note = card.querySelector('p.card-sub');
  if (note && note.textContent !== text) note.textContent = text;
}
