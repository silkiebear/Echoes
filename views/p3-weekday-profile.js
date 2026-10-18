// P3 Weekday Profile. Data (core/profile-demo.js buildWeekdayProfile): { title, rows, baseline }.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { estimateWidth } from '../core/textfit.js';
import { formatPercent } from '../core/format.js';

const P = viewSettings.time.profile;
const pad = viewSettings.time.pad;
const small = viewSettings.text.smallFontPx;
const { barWidth, barGap, plotHeight, marginLeft } = P;
const MIN_MAX_RATE = 0.1;

export default {
  id: 'P3',
  title: 'Weekday profile',
  variants: [],
  render,
};

function render(data, opts = {}) {
  const available = opts.width || viewSettings.defaultWidth;
  const plotW = Math.max(marginLeft, available - marginLeft - pad);
  const pitch = Math.max(barWidth + barGap, Math.floor(plotW / data.rows.length));
  const barW = Math.min(barWidth, pitch - barGap);
  const x0 = marginLeft;
  const maxRate = Math.max(data.baseline, ...data.rows.map((r) => r.rate), MIN_MAX_RATE);
  const plotTop = pad + small + pad;
  const y = (rate) => plotTop + plotHeight * (1 - rate / maxRate);
  const baseY = y(data.baseline);
  const bottom = plotTop + plotHeight;
  let body = '';
  body += svgText(marginLeft - pad / 2, y(0), formatPercent(0), 't-muted', 'end', small);
  body += svgText(marginLeft - pad / 2, y(maxRate), formatPercent(maxRate), 't-muted', 'end', small);
  body += `<line class="axis" x1="${marginLeft}" y1="${plotTop}" x2="${marginLeft}" y2="${bottom}"/>`;
  body += `<line class="baseline" x1="${marginLeft}" y1="${baseY}" x2="${x0 + data.rows.length * pitch}" y2="${baseY}"/>`;
  for (let i = 0; i < data.rows.length; i += 1) {
    const row = data.rows[i];
    const cx = x0 + i * pitch + (pitch - barW) / 2 + barW / 2;
    const height = plotHeight * (row.rate / maxRate);
    const by = bottom - height;
    body += `<rect class="bar" x="${x0 + i * pitch + (pitch - barW) / 2}" y="${by}" width="${barW}" height="${height}" rx="2"/>`;
    const vLabelY = Math.max(plotTop, by - pad / 2);
    body += svgText(cx, vLabelY, formatPercent(row.rate), 't', 'middle', small);
    body += svgText(cx, bottom + pad + small / 2, row.label, 't-muted', 'middle', small);
    // Days with the label on this weekday (phase 4c, 4c.3): rate x n is the count, exact up to rounding. The bar height
    // is the share of the observed days on this weekday, which the card note says.
    body += svgText(cx, bottom + pad + small / 2 + small + pad / 2, String(Math.round(row.rate * row.n)), 't-muted', 'middle', small);
  }
  const width = x0 + data.rows.length * pitch + pad;
  const nLineY = bottom + pad + small / 2 + small + pad / 2;
  const height = nLineY + small / 2 + pad;
  return svgDoc({ width, height, title: 'P3 Weekday profile', desc: 'Share of days with the label, by weekday, with the overall baseline', body });
}
