// T2 Lanes Timeline. Data (time-demo.js buildLanesData): { span, dates, rows: [{ id, text, present }], mood }.
// opts.range: id from config time.lanes.ranges (the last N days; 0 = all). opts.width: available CSS px.
// When days per pixel is above 1, days are grouped into buckets of ceil(days per pixel) days. A bucket gets a tick
// when any day in it has the label, and the mood band shows the bucket's mean mood.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { moodBin } from './diverge.js';
import { estimateWidth } from '../core/textfit.js';
import { monthYear } from '../core/time-demo.js';

const L = viewSettings.time.lanes;
const pad = viewSettings.time.pad;
const { fontPx, smallFontPx } = viewSettings.text;

function rangeOf(id) {
  return L.ranges.find((r) => r.id === id) || L.ranges.find((r) => r.id === L.defaultRange);
}

function meanMood(data, from, to) {
  let sum = 0;
  for (let i = from; i < to; i++) sum += data.mood[i];
  return sum / (to - from);
}

function render(data, opts = {}) {
  const range = rangeOf(opts.range);
  const span = range.days > 0 ? Math.min(range.days, data.span) : data.span;
  const first = data.span - span;
  const labelWidth = Math.max(...data.rows.map((row) => estimateWidth(row.text, fontPx)));
  const x0 = pad + labelWidth + pad;
  const plotW = Math.max(L.minPlotWidth, (opts.width || viewSettings.defaultWidth) - x0 - pad);
  const bucket = Math.max(1, Math.ceil(span / plotW));
  const buckets = Math.ceil(span / bucket);
  const pitch = plotW / buckets;
  const tickWidth = Math.max(L.tickMinWidth, pitch);
  const tickY = (L.rowHeight - L.tickHeight) / 2;

  let body = '';
  let y = pad;
  for (const row of data.rows) {
    body += svgText(pad, y + L.rowHeight / 2, row.text, 't');
    for (let b = 0; b < buckets; b++) {
      const from = first + b * bucket;
      const to = Math.min(data.span, from + bucket);
      let count = 0;
      for (let i = from; i < to; i++) count += row.present[i];
      if (count > 0) body += `<rect class="tick" x="${x0 + b * pitch}" y="${y + tickY}" width="${tickWidth}" height="${L.tickHeight}"/>`;
    }
    y += L.rowHeight + L.rowGap;
  }

  const bandTop = y;
  body += svgText(pad, bandTop + L.moodBandHeight / 2, 'mood', 't-muted', 'start', smallFontPx);
  for (let b = 0; b < buckets; b++) {
    const from = first + b * bucket;
    const mood = meanMood(data, from, Math.min(data.span, from + bucket));
    body += `<rect class="bin-${moodBin(mood)}" x="${x0 + b * pitch}" y="${bandTop}" width="${pitch}" height="${L.moodBandHeight}"/>`;
  }

  const axisY = bandTop + L.moodBandHeight + L.axisGap + smallFontPx / 2;
  body += svgText(x0, axisY, monthYear(data.dates[first]), 't-muted', 'start', smallFontPx);
  body += svgText(x0 + plotW, axisY, monthYear(data.dates[data.span - 1]), 't-muted', 'end', smallFontPx);

  return svgDoc({
    width: x0 + plotW + pad,
    height: axisY + smallFontPx / 2 + pad,
    title: 'T2 Lanes timeline',
    desc: `Selected labels as lanes over a mood band, ${range.label}, ${bucket > 1 ? `${bucket} days per bucket` : 'one tick per day'}`,
    body,
  });
}

export default {
  id: 'T2',
  title: 'Lanes timeline',
  variants: [{ id: 'a', label: 'Lanes' }],
  render,
};
