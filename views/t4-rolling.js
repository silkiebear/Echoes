// T4 Rolling Rates. Data (time-demo.js buildRollingData): { window, startDate, endDate, series: [{ id, text, values }] }.
// values[i] is the share of the `window` days ending on day (window - 1 + i) that have the label.
// The window length is chosen in the gallery (it changes the data). opts.width: available CSS px.
// The legend is one row per line above the plot, so it never sits on the plot.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { formatPercent } from '../core/format.js';
import { monthYear } from '../core/time-demo.js';

const R = viewSettings.time.rolling;
const pad = viewSettings.time.pad;
const smallGap = viewSettings.time.smallGap;
const { smallFontPx } = viewSettings.text;

function maxValue(series) {
  let max = 0;
  for (const s of series) for (const v of s.values) if (v > max) max = v;
  return max;
}

function render(data, opts = {}) {
  const available = opts.width || viewSettings.defaultWidth;
  const plotW = Math.max(R.minPlotWidth, available - R.marginLeft - R.marginRight);
  const width = R.marginLeft + plotW + R.marginRight;
  const legendTop = pad;
  const plotTop = legendTop + data.series.length * R.legendRowHeight + R.legendGap;
  const plotBottom = plotTop + R.plotHeight;
  const yMax = Math.max(R.minYMax, maxValue(data.series)) * R.yHeadroom;
  const count = data.series.length ? data.series[0].values.length : 0;
  const xOf = (i) => R.marginLeft + (count > 1 ? i / (count - 1) : 0) * plotW;
  const yOf = (v) => plotTop + R.plotHeight * (1 - v / yMax);

  let body = '';
  data.series.forEach((s, k) => {
    const bin = R.seriesBins[k];
    const rowY = legendTop + k * R.legendRowHeight;
    body += `<rect class="bin-${bin}" x="${pad}" y="${rowY + (R.legendRowHeight - R.swatch) / 2}" width="${R.swatch}" height="${R.swatch}"/>`;
    body += svgText(pad + R.swatch + smallGap, rowY + R.legendRowHeight / 2, s.text, 't');
  });

  body += `<line class="axis" x1="${R.marginLeft}" y1="${plotTop}" x2="${R.marginLeft}" y2="${plotBottom}"/>`;
  body += `<line class="axis" x1="${R.marginLeft}" y1="${plotBottom}" x2="${R.marginLeft + plotW}" y2="${plotBottom}"/>`;
  body += svgText(R.marginLeft - smallGap, yOf(0), formatPercent(0), 't-muted', 'end', smallFontPx);
  body += svgText(R.marginLeft - smallGap, yOf(yMax / R.yHeadroom), formatPercent(yMax / R.yHeadroom), 't-muted', 'end', smallFontPx);
  data.series.forEach((s, k) => {
    const points = s.values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
    body += `<polyline class="line line-${R.seriesBins[k]}" points="${points}"/>`;
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
