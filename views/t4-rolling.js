// T4 Rolling Rates. Data (time-demo.js buildRollingData): { window, startDate, endDate, series: [{ id, text, values }] }.
// values[i] is the share of the `window` days ending on day (window - 1 + i) that have the label.
// The window length is chosen in the gallery (it changes the data). opts.width: available CSS px.
// The legend is one row per line above the plot, so it never sits on the plot.
// Long series are bucket-averaged to at most one point per R.pxPerPoint CSS px, so lines are not stair-stepped.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { formatPercent } from '../core/format.js';
import { monthYear } from '../core/time-demo.js';
import { seriesStyle, seriesMarkerSvg } from './series.js';

const R = viewSettings.time.rolling;
const pad = viewSettings.time.pad;
const smallGap = viewSettings.time.smallGap;
const { smallFontPx } = viewSettings.text;
const MIN_POINTS = 2; // a line needs at least two points

function maxValue(series) {
  let max = 0;
  for (const s of series) for (const v of s.values) if (v > max) max = v;
  return max;
}

// Averages runs of consecutive values so that at most maxPoints remain.
function bucketAverage(values, maxPoints) {
  if (values.length <= maxPoints) return values;
  const out = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const start = Math.floor((i * values.length) / maxPoints);
    const end = Math.floor(((i + 1) * values.length) / maxPoints);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += values[j];
    out.push(sum / (end - start));
  }
  return out;
}

// Evenly spaced point indices for the markers of one line, from the first point to the last.
function markerIndices(n, count) {
  const shown = Math.min(count, n);
  const out = [];
  for (let i = 0; i < shown; i += 1) out.push(shown === 1 ? 0 : Math.round((i * (n - 1)) / (shown - 1)));
  return out;
}

function render(data, opts = {}) {
  const available = opts.width || viewSettings.defaultWidth;
  const plotW = Math.max(R.minPlotWidth, available - R.marginLeft - R.marginRight);
  const maxPoints = Math.max(MIN_POINTS, Math.floor(plotW / R.pxPerPoint));
  const series = data.series.map((s) => ({ ...s, values: bucketAverage(s.values, maxPoints) }));
  const width = R.marginLeft + plotW + R.marginRight;
  const legendTop = pad;
  const plotTop = legendTop + data.series.length * R.legendRowHeight + R.legendGap;
  const plotBottom = plotTop + R.plotHeight;
  const yMax = Math.max(R.minYMax, maxValue(series)) * R.yHeadroom;
  const count = series.length ? series[0].values.length : 0;
  const xOf = (i) => R.marginLeft + (count > 1 ? i / (count - 1) : 0) * plotW;
  const yOf = (v) => plotTop + R.plotHeight * (1 - v / yMax);

  let body = '';
  data.series.forEach((s, k) => {
    const style = seriesStyle(k);
    const cy = legendTop + k * R.legendRowHeight + R.legendRowHeight / 2;
    body += `<g data-series="${k}" data-role="key" data-marker="${style.marker}">${seriesMarkerSvg(style, pad + R.swatch / 2, cy)}</g>`;
    body += svgText(pad + R.swatch + smallGap, cy, s.text, 't');
  });

  body += `<line class="axis" x1="${R.marginLeft}" y1="${plotTop}" x2="${R.marginLeft}" y2="${plotBottom}"/>`;
  body += `<line class="axis" x1="${R.marginLeft}" y1="${plotBottom}" x2="${R.marginLeft + plotW}" y2="${plotBottom}"/>`;
  body += svgText(R.marginLeft - smallGap, yOf(0), formatPercent(0), 't-muted', 'end', smallFontPx);
  body += svgText(R.marginLeft - smallGap, yOf(yMax / R.yHeadroom), formatPercent(yMax / R.yHeadroom), 't-muted', 'end', smallFontPx);
  series.forEach((s, k) => {
    const style = seriesStyle(k);
    const points = s.values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
    body += `<g data-series="${k}" data-role="line"><polyline class="line ${style.cls}" points="${points}" style="stroke-width:${R.lineWidth}px"/>`;
    for (const i of markerIndices(s.values.length, R.perLine)) {
      body += seriesMarkerSvg(style, xOf(i), yOf(s.values[i]), ` data-mark="${k}"`);
    }
    body += '</g>';
  });

  const axisY = plotBottom + pad + smallFontPx / 2;
  body += svgText(R.marginLeft, axisY, monthYear(data.startDate), 't-muted', 'start', smallFontPx);
  body += svgText(R.marginLeft + plotW, axisY, monthYear(data.endDate), 't-muted', 'end', smallFontPx);

  return svgDoc({
    width,
    height: axisY + smallFontPx / 2 + pad,
    title: 'T4 Rolling rates',
    desc: `${data.window}-day rolling share of days with each selected label`,
    body,
  });
}

export default {
  id: 'T4',
  title: 'Rolling rates',
  variants: [{ id: 'a', label: 'Lines' }],
  render,
};
