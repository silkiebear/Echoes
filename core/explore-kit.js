// Helpers shared by the Explore cards (phase 4c, 4c.2 and 4c.3). The derived view data is cached per (data, settings)
// pair. Pure, except that messageSvg only builds a string. Text is filled into placeholders in one pass.
import { toViewData } from './view-data.js';
import { svgDoc, svgText } from './svg.js';
import { explore } from '../config/explore.js';
import { viewSettings } from '../config/views.js';

const chart = explore.chart;

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

// A card with nothing to draw yet shows its message inside the chart area (same frame as the views).
export function messageSvg(width, message, title) {
  return svgDoc({
    width: width || viewSettings.defaultWidth,
    height: chart.messageHeight,
    title,
    desc: message,
    body: svgText(chart.messagePad, chart.messageBaseline, message, 't-muted', 'start'),
  });
}

// The card's note is the second paragraph of the card (heading, note, controls, chart).
export function setNote(card, text) {
  const note = card.querySelector('p.card-sub');
  if (note && note.textContent !== text) note.textContent = text;
}
